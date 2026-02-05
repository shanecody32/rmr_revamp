//! Band similarity search functions.

use crate::models::bands::{Entity as Band, Model as BandModel};
use crate::models::band_aliases::{Entity as BandAlias, Column as BandAliasColumn};
use crate::services::types::{SimilarityParams, SimilarResult};
use crate::utils::similarity::find_similar_pipeline;
use super::types::BandResponse;
use super::relations::load_band_relations;
use sea_orm::*;

/// Find similar bands using phonetic matching and fuzzy search.
pub async fn get_similar_bands(db: &DatabaseConnection, params: SimilarityParams) -> Result<Vec<SimilarResult<BandResponse>>, DbErr> {
    tracing::debug!("get_similar_bands called with search_term: {}", params.search_term);

    let search_term = &params.search_term;
    let sanitized = crate::utils::slug::sanitize_name(search_term);

    // PHASE 1: Search band_aliases table (for indexed phonetic matches)
    let mut alias_results: Vec<SimilarResult<crate::models::band_aliases::Model>> = Vec::new();

    let mut alias_query = BandAlias::find();
    if let Some(true) = params.restrict_to_parent
        && let Some(country_id) = params.country_id {
            alias_query = alias_query.join(JoinType::InnerJoin, BandAlias::belongs_to(Band).from(BandAliasColumn::BandId).to(crate::models::bands::Column::Id).into())
                         .filter(crate::models::bands::Column::CountryId.eq(country_id));
        }

    match find_similar_pipeline(
        db,
        alias_query,
        crate::utils::similarity::pipeline::SimilarityColumns {
            name: BandAliasColumn::AliasKey,
            slug: BandAliasColumn::Slug,
            sanitized: Some(BandAliasColumn::SanitizedName),
            soundex: Some(BandAliasColumn::SoundexKey),
            phonetic: Some(BandAliasColumn::PhoneticKey),
            metaphone: Some(BandAliasColumn::MetaphoneKey),
            dmetaphone: Some(BandAliasColumn::DmetaphoneKey),
            dmetaphone_alt: Some(BandAliasColumn::DmetaphoneAltKey),
        },
        params.clone(),
        BandAliasColumn::BandId,
        |m| m.alias_key.clone(),
    ).await {
        Ok(r) => {
            tracing::debug!("Alias search returned {} results", r.len());
            alias_results = r;
        },
        Err(e) => {
            tracing::warn!("Alias search error (continuing with direct search): {:?}", e);
        }
    };

    // PHASE 2: Also search bands table directly (catches bands without aliases)
    // This is important because the backfill may not have run yet
    // Use broad search terms (split on &, +, and, with, feat, etc.)
    let search_terms = crate::utils::slug::extract_search_terms(search_term);
    tracing::debug!("Extracted search terms: {:?}", search_terms);

    // Build OR conditions for all search terms
    let mut conditions = Condition::any();
    for term in &search_terms {
        conditions = conditions
            .add(crate::models::bands::Column::Name.contains(term))
            .add(crate::models::bands::Column::Slug.contains(crate::utils::slug::slug_it(term)));
    }
    // Also add exact slug match for the original
    conditions = conditions.add(crate::models::bands::Column::Slug.eq(crate::utils::slug::slug_it(search_term)));

    let direct_bands = Band::find()
        .filter(conditions)
        .limit(500)
        .all(db)
        .await?;

    tracing::debug!("Direct band search returned {} results", direct_bands.len());

    // Score the direct results using fuzzy matching
    let min_score = params.min_similarity.unwrap_or(40);
    let jw_weight = params.jw_weight.unwrap_or(0.5);
    let dice_weight = params.dice_weight.unwrap_or(0.5);

    let mut direct_results: Vec<SimilarResult<BandModel>> = Vec::new();
    for band in direct_bands {
        let band_name_sanitized = crate::utils::slug::sanitize_name(&band.name);
        if let Some(score) = crate::utils::similarity::pipeline::calculate_similarity_score(
            &sanitized,
            &band_name_sanitized,
            jw_weight,
            dice_weight,
            min_score,
        ) {
            direct_results.push(SimilarResult {
                model: band,
                similarity_score: score,
            });
        }
    }

    // Combine alias results with direct results
    // First, get band IDs from alias results
    let alias_band_ids: Vec<u32> = alias_results.iter().map(|r| r.model.band_id).collect();

    // Load bands for alias results
    let alias_bands = if !alias_band_ids.is_empty() {
        Band::find()
            .filter(crate::models::bands::Column::Id.is_in(alias_band_ids.clone()))
            .all(db)
            .await?
    } else {
        Vec::new()
    };

    // Convert alias results to band results
    let mut final_results: Vec<SimilarResult<BandModel>> = Vec::new();
    for r in alias_results {
        if let Some(band) = alias_bands.iter().find(|b| b.id == r.model.band_id) {
            final_results.push(SimilarResult {
                model: band.clone(),
                similarity_score: r.similarity_score,
            });
        }
    }

    // Add direct results that aren't already in final_results
    let existing_ids: std::collections::HashSet<u32> = final_results.iter().map(|r| r.model.id).collect();
    for r in direct_results {
        if !existing_ids.contains(&r.model.id) {
            final_results.push(r);
        }
    }

    // Filter out the existing_id if provided
    if let Some(exclude_id) = params.existing_id {
        final_results.retain(|r| r.model.id != exclude_id);
    }

    // Sort by similarity score descending
    final_results.sort_by(|a, b| b.similarity_score.cmp(&a.similarity_score));

    // De-duplicate final results by band ID
    let mut seen = std::collections::HashSet::new();
    final_results.retain(|r| seen.insert(r.model.id));

    // Limit results (default 20)
    let limit = params.limit.unwrap_or(20);
    final_results.truncate(limit);

    // Load full band relations for the limited results
    let band_models: Vec<BandModel> = final_results.iter().map(|r| r.model.clone()).collect();
    let bands_with_relations = load_band_relations(db, band_models).await?;

    // Map back with scores, maintaining the original order
    let mut results_with_relations: Vec<SimilarResult<BandResponse>> = Vec::new();
    for result in &final_results {
        if let Some(full) = bands_with_relations.iter().find(|b| b.band.id == result.model.id) {
            results_with_relations.push(SimilarResult {
                model: full.clone(),
                similarity_score: result.similarity_score,
            });
        }
    }

    Ok(results_with_relations)
}
