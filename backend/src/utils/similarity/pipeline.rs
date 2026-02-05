use strsim::{jaro_winkler, sorensen_dice};
use sea_orm::{
    Condition, ColumnTrait, EntityTrait, QueryFilter, QuerySelect,
    DatabaseConnection, DbErr, DbBackend, Select, sea_query::Expr,
    Value
};
use futures_util::stream::{self, StreamExt};
use std::collections::HashSet;
use std::env;
use crate::services::types::{SimilarityParams, SimilarResult};
use crate::utils::slug::{sanitize_name, slug_it};

/// Calculate similarity score as a percentage (0-100)
/// Returns None if the score is below the minimum threshold
pub fn calculate_similarity_score(
    sanitized_name: &str,
    sanitized_db_name: &str,
    jw_weight: f64,
    dice_weight: f64,
    min_score: i32,
) -> Option<i32> {
    // Handle edge cases
    if sanitized_name.is_empty() || sanitized_db_name.is_empty() {
        return None;
    }

    // Exact match
    if sanitized_name == sanitized_db_name {
        return Some(100);
    }

    // Check for contains relationship (important for "Willie Nelson" vs "Willie Nelson and Dolly Parton")
    let contains_bonus = if sanitized_db_name.contains(sanitized_name) || sanitized_name.contains(sanitized_db_name) {
        // Bonus based on how much of the shorter string is in the longer
        let shorter = sanitized_name.len().min(sanitized_db_name.len());
        let longer = sanitized_name.len().max(sanitized_db_name.len());
        (shorter as f64 / longer as f64) * 0.3 // Up to 30% bonus for contains
    } else {
        0.0
    };

    // Calculate base similarity scores
    let jw_score = jaro_winkler(sanitized_name, sanitized_db_name);
    let dice_score = sorensen_dice(sanitized_name, sanitized_db_name);

    // Weighted combination
    let base_score = (jw_weight * jw_score) + (dice_weight * dice_score);

    // Word overlap (Jaccard index) - order-independent matching
    // "willie nelson and dolly parton" → {willie, nelson, and, dolly, parton}
    // "dolly parton and willie nelson" → {dolly, parton, and, willie, nelson}
    // These sets are IDENTICAL → Jaccard = 1.0 (100%)
    let words_a: HashSet<&str> = sanitized_name.split_whitespace().collect();
    let words_b: HashSet<&str> = sanitized_db_name.split_whitespace().collect();
    let intersection = words_a.intersection(&words_b).count();
    let union = words_a.union(&words_b).count();
    let jaccard = if union > 0 { intersection as f64 / union as f64 } else { 0.0 };

    // Weight word overlap for longer names (3+ words)
    // Up to 25% bonus - significant enough to push similar names over threshold
    let word_bonus = if words_a.len() >= 3 || words_b.len() >= 3 {
        jaccard * 0.25
    } else {
        0.0
    };

    // Add contains bonus and word overlap bonus
    let combined_score = (base_score + contains_bonus + word_bonus).min(1.0);

    // Convert to percentage (0-100)
    let percentage = (combined_score * 100.0).round() as i32;

    // Only return if above minimum threshold
    if percentage >= min_score {
        Some(percentage)
    } else {
        None
    }
}

pub struct SimilarityColumns<C> {
    pub name: C,
    pub slug: C,
    pub sanitized: Option<C>,
    pub soundex: Option<C>,
    pub phonetic: Option<C>,
    pub metaphone: Option<C>,
    pub dmetaphone: Option<C>,
    pub dmetaphone_alt: Option<C>,
}

pub fn add_safe_db_similarity_conditions(
    mut condition: Condition,
    columns: &SimilarityColumns<impl ColumnTrait>,
    search_term: &str,
    sanitized_name: &str,
    backend: DbBackend,
) -> Condition {
    let col_name = columns.name.to_string();

    // 1. Name contains (Standard LIKE)
    condition = condition
        .add(columns.name.contains(search_term))
        .add(columns.name.contains(sanitized_name));

    // 2. Sanitized name match (if column exists)
    if let Some(san_col) = &columns.sanitized {
        condition = condition.add(san_col.eq(sanitized_name));
    }

    // 3. SOUNDEX
    if let Some(sx_col) = &columns.soundex {
        // Use precomputed soundex column
        condition = condition.add(sx_col.eq(crate::utils::similarity::keys::soundex(sanitized_name)));
    } else {
        // Fallback to runtime calculation
        condition = condition
            .add(Expr::cust_with_values(format!("SOUNDEX({}) = SOUNDEX(?)", col_name), [Value::from(sanitized_name)]))
            .add(Expr::cust_with_values(format!("SOUNDEX({}) = SOUNDEX(?)", col_name), [Value::from(search_term)]));
    }

    // 4. Phonetic / Metaphone
    if let Some(ph_col) = &columns.phonetic {
        // Legacy/Generic phonetic column (using Double Metaphone Primary)
        let (p, _) = crate::utils::similarity::keys::double_metaphone(sanitized_name);
        condition = condition.add(ph_col.eq(p));
    }

    if let Some(m_col) = &columns.metaphone {
        condition = condition.add(m_col.eq(crate::utils::similarity::keys::metaphone(sanitized_name)));
    }

    if let Some(dm_col) = &columns.dmetaphone {
        let (p, _) = crate::utils::similarity::keys::double_metaphone(sanitized_name);
        condition = condition.add(dm_col.eq(p));
    }

    if let Some(dma_col) = &columns.dmetaphone_alt {
        let (_, a) = crate::utils::similarity::keys::double_metaphone(sanitized_name);
        if let Some(alt) = a {
            condition = condition.add(dma_col.eq(alt));
        }
    }

    // 5. Postgres-specific optimizations
    if backend == DbBackend::Postgres {
        condition = condition
            .add(Expr::cust_with_values(format!("{} % ?", col_name), [Value::from(sanitized_name)]))
            .add(Expr::cust_with_values(format!("similarity({}, ?) > 0.3", col_name), [Value::from(sanitized_name)]));
        
        if columns.metaphone.is_none() && columns.dmetaphone.is_none() {
             condition = condition
                .add(Expr::cust_with_values(format!("metaphone({}, 4) = metaphone(?, 4)", col_name), [Value::from(sanitized_name)]))
                .add(Expr::cust_with_values(format!("dmetaphone({}) = dmetaphone(?)", col_name), [Value::from(sanitized_name)]));
        }
    }

    condition
}

/// Filter models by fuzzy similarity and return sorted by score (highest first)
pub async fn fuzzy_filter_models<M, F>(
    models: Vec<M>,
    sanitized_name: &str,
    min_score: i32,
    jw_weight: f64,
    dice_weight: f64,
    get_name: F,
) -> Vec<(M, i32)>
where
    M: Send + Sync,
    F: Fn(&M) -> String + Send + Sync,
{
    let buffer_size: usize = env::var("FUZZY_BUFFER_SIZE")
        .ok()
        .and_then(|val| val.parse().ok())
        .unwrap_or(50);

    let futures = stream::iter(models.into_iter().map(|model| {
        let get_name = &get_name;
        async move {
            let db_name = get_name(&model).to_lowercase();
            let sanitized_db_name = sanitize_name(&db_name);

            calculate_similarity_score(
                sanitized_name,
                &sanitized_db_name,
                jw_weight,
                dice_weight,
                min_score,
            ).map(|score| (model, score))
        }
    }))
    .buffer_unordered(buffer_size)
    .collect::<Vec<_>>()
    .await;

    let mut results: Vec<(M, i32)> = futures.into_iter().flatten().collect();
    // Sort by score descending (highest similarity first)
    results.sort_unstable_by(|a, b| b.1.cmp(&a.1));
    results
}

pub async fn find_similar_pipeline<E, F>(
    db: &DatabaseConnection,
    mut query: Select<E>,
    columns: SimilarityColumns<E::Column>,
    params: SimilarityParams,
    id_column: E::Column,
    get_name: F,
) -> Result<Vec<SimilarResult<E::Model>>, DbErr>
where
    E: EntityTrait,
    E::Model: Send + Sync + Clone,
    F: Fn(&E::Model) -> String + Send + Sync,
{
    let search_term = &params.search_term;
    let sanitized_name = sanitize_name(search_term);
    let backend = db.get_database_backend();

    let mut condition = Condition::any()
        .add(columns.slug.eq(slug_it(search_term)));

    condition = add_safe_db_similarity_conditions(condition, &columns, search_term, &sanitized_name, backend);

    query = query.filter(condition);

    if let Some(id) = params.existing_id {
        query = query.filter(id_column.ne(id));
    }

    let candidates = query
        .limit(1000)
        .all(db)
        .await?;

    // Default min_similarity is 40% - broad enough to catch variations like
    // "Willie Nelson" vs "Willie Nelson and Dolly Parton"
    let results = fuzzy_filter_models(
        candidates,
        &sanitized_name,
        params.min_similarity.unwrap_or(40),
        params.jw_weight.unwrap_or(0.5),
        params.dice_weight.unwrap_or(0.5),
        get_name,
    )
    .await;

    Ok(results.into_iter().map(|(model, score)| SimilarResult {
        model,
        similarity_score: score,
    }).collect())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sorensen_dice() {
        assert!((sorensen_dice("apple", "apple") - 1.0).abs() < 1e-9);
        assert!((sorensen_dice("apple", "aple") - 0.857).abs() < 0.01);
        assert!(sorensen_dice("apple", "banana") < 0.1);
    }

    #[test]
    fn test_calculate_similarity_score() {
        // Exact match should be 100%
        let score = calculate_similarity_score("beatles", "beatles", 0.5, 0.5, 40);
        assert_eq!(score, Some(100));

        // High similarity (minor typo)
        let score = calculate_similarity_score("beatles", "beatle", 0.5, 0.5, 40);
        assert!(score.is_some());
        assert!(score.unwrap() >= 80); // Should be high

        // Contains relationship - "Willie Nelson" vs "Willie Nelson and Dolly Parton"
        let score = calculate_similarity_score("willie nelson", "willie nelson and dolly parton", 0.5, 0.5, 40);
        assert!(score.is_some());
        assert!(score.unwrap() >= 50); // Should pass due to contains bonus

        // Low similarity should be None (below threshold)
        let score = calculate_similarity_score("beatles", "metallica", 0.5, 0.5, 40);
        assert!(score.is_none());
    }

    #[test]
    fn test_word_order_independent_matching() {
        // Same words, different order - should have high similarity due to Jaccard bonus
        let score = calculate_similarity_score(
            "willie nelson and dolly parton",
            "dolly parton and willie nelson",
            0.5, 0.5, 40
        );
        assert!(score.is_some());
        assert!(score.unwrap() >= 80, "Same words in different order should score high: {:?}", score);

        // Connector variation ("and" vs "with") - should still score high
        let score = calculate_similarity_score(
            "willie nelson and dolly parton",
            "willie nelson with dolly parton",
            0.5, 0.5, 40
        );
        assert!(score.is_some());
        assert!(score.unwrap() >= 75, "Connector variation should score high: {:?}", score);

        // Both: different order AND connector variation
        let score = calculate_similarity_score(
            "dolly parton with willie nelson",
            "willie nelson and dolly parton",
            0.5, 0.5, 40
        );
        assert!(score.is_some());
        assert!(score.unwrap() >= 70, "Different order + connector should still score well: {:?}", score);
    }
}
