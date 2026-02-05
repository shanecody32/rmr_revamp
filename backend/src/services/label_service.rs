use crate::models::labels::{Entity as Label, Model as LabelModel, Column as LabelColumn};
use sea_orm::*;
use crate::services::types::{PaginatedResponse, PaginationInfo, SimilarityParams, SimilarResult};
use crate::utils::similarity::find_similar_pipeline;
use crate::utils::similarity::keys;
use crate::utils::slug::{slug_it, sanitize_name};
use crate::models::label_aliases::{Entity as LabelAlias, Column as LabelAliasColumn};
use crate::models::label_duplicate_candidates::{Entity as LabelDuplicateCandidate, Column as LabelDuplicateCandidateColumn};
use crate::services::action_log_service::ActionLogService;
use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};
use std::collections::HashSet;

#[derive(Debug, Serialize, ToSchema)]
pub struct LabelResponse {
    pub id: u32,
    pub name: String,
    pub slug: String,
    pub album_count: u64,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct LabelFilterParams {
    pub page: Option<u64>,
    pub page_size: Option<u64>,
    pub name: Option<String>,
    pub name_filter_type: Option<String>,
    pub sort_field: Option<String>,
    pub sort_ascending: Option<bool>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateLabelRequest {
    pub name: String,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct UpdateLabelRequest {
    pub name: Option<String>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct MergeLabelsRequest {
    pub from_ids: Vec<u32>,
    pub into_id: u32,
    pub merged_data: serde_json::Value,
}

#[derive(Debug, Serialize, ToSchema, Default)]
pub struct LabelMergeStats {
    pub albums_reassigned: u32,
    pub aliases_moved: u32,
    pub aliases_deduped: u32,
    pub duplicate_candidates_updated: u32,
    pub duplicate_candidates_cleaned: u32,
    pub labels_deleted: u32,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct LabelMergeResult {
    pub merged_label: LabelModel,
    pub stats: LabelMergeStats,
}

pub struct LabelService;

impl LabelService {
    pub async fn get_labels(
        db: &DatabaseConnection,
        params: LabelFilterParams,
    ) -> Result<PaginatedResponse<LabelResponse>, DbErr> {
        let page = params.page.unwrap_or(1);
        let page_size = params.page_size.unwrap_or(10);

        let mut query = Label::find();

        if let Some(name) = params.name
            && !name.is_empty() {
                match params.name_filter_type.as_deref() {
                    Some("starts_with") => {
                        query = query.filter(LabelColumn::Name.starts_with(&name));
                    }
                    Some("ends_with") => {
                        query = query.filter(LabelColumn::Name.ends_with(&name));
                    }
                    Some("exact_match") => {
                        query = query.filter(LabelColumn::Name.eq(&name));
                    }
                    _ => {
                        query = query.filter(LabelColumn::Name.contains(&name));
                    }
                }
            }

        if let Some(sort_field) = params.sort_field {
            let order = if params.sort_ascending.unwrap_or(true) {
                Order::Asc
            } else {
                Order::Desc
            };

            match sort_field.as_str() {
                "name" => {
                    query = query.order_by(LabelColumn::Name, order);
                }
                "created_at" => {
                    query = query.order_by(LabelColumn::Created, order);
                }
                "updated_at" => {
                    query = query.order_by(LabelColumn::Modified, order);
                }
                _ => {
                    query = query.order_by(LabelColumn::Id, order);
                }
            }
        } else {
            query = query.order_by_desc(LabelColumn::Id);
        }

        let paginator = query.paginate(db, page_size);
        let total_items = paginator.num_items().await?;
        let total_pages = paginator.num_pages().await?;

        let labels = paginator.fetch_page(page - 1).await?;
        let results = Self::to_label_responses(db, labels).await?;

        Ok(PaginatedResponse {
            results,
            pagination: PaginationInfo {
                page,
                page_size,
                total_pages,
                total_items,
            },
        })
    }

    pub async fn get_label_by_id(
        db: &DatabaseConnection,
        id: u32,
    ) -> Result<Option<LabelResponse>, DbErr> {
        let label = Label::find_by_id(id).one(db).await?;
        match label {
            Some(label) => {
                let responses = Self::to_label_responses(db, vec![label]).await?;
                Ok(responses.into_iter().next())
            }
            None => Ok(None),
        }
    }

    pub async fn create_label(
        db: &DatabaseConnection,
        data: CreateLabelRequest,
    ) -> Result<LabelResponse, DbErr> {
        let slug = slug_it(&data.name);

        let active_model = crate::models::labels::ActiveModel {
            name: Set(Some(data.name.clone())),
            slug: Set(Some(slug.clone())),
            ..Default::default()
        };

        let label = active_model.insert(db).await?;

        // Create alias entry
        Self::create_label_alias(db, label.id, &data.name).await?;

        let responses = Self::to_label_responses(db, vec![label]).await?;
        Ok(responses.into_iter().next().unwrap())
    }

    pub async fn update_label(
        db: &DatabaseConnection,
        id: u32,
        data: UpdateLabelRequest,
    ) -> Result<LabelResponse, DbErr> {
        let label = Label::find_by_id(id).one(db).await?
            .ok_or(DbErr::RecordNotFound("Label not found".to_string()))?;

        let name_changed = data.name.is_some() && data.name.as_deref() != label.name.as_deref();
        let mut active_model: crate::models::labels::ActiveModel = label.into();

        if let Some(name) = &data.name {
            active_model.name = Set(Some(name.clone()));
            active_model.slug = Set(Some(slug_it(name)));
        }

        let updated = active_model.update(db).await?;

        // Regenerate alias if name changed
        if name_changed
            && let Some(name) = &data.name {
                Self::create_label_alias(db, id, name).await?;
            }

        let responses = Self::to_label_responses(db, vec![updated]).await?;
        Ok(responses.into_iter().next().unwrap())
    }

    async fn create_label_alias(
        db: &DatabaseConnection,
        label_id: u32,
        name: &str,
    ) -> Result<(), DbErr> {
        let slug = slug_it(name);
        let sanitized = sanitize_name(name);
        let soundex_key = keys::soundex(name);
        let metaphone_key = keys::metaphone(name);
        let (dmetaphone_key, dmetaphone_alt_key) = keys::double_metaphone(name);

        // Check if alias already exists for this label with this key
        let existing = LabelAlias::find()
            .filter(LabelAliasColumn::LabelId.eq(label_id))
            .filter(LabelAliasColumn::AliasKey.eq(name))
            .one(db)
            .await?;

        if existing.is_some() {
            return Ok(());
        }

        let alias = crate::models::label_aliases::ActiveModel {
            label_id: Set(label_id),
            alias_key: Set(name.to_string()),
            slug: Set(Some(slug)),
            sanitized_name: Set(Some(sanitized)),
            soundex_key: Set(Some(soundex_key)),
            phonetic_key: Set(Some(metaphone_key.clone())),
            metaphone_key: Set(Some(metaphone_key)),
            dmetaphone_key: Set(Some(dmetaphone_key)),
            dmetaphone_alt_key: Set(dmetaphone_alt_key),
            ..Default::default()
        };

        alias.insert(db).await?;
        Ok(())
    }

    async fn to_label_responses(
        db: &DatabaseConnection,
        labels: Vec<LabelModel>,
    ) -> Result<Vec<LabelResponse>, DbErr> {
        if labels.is_empty() {
            return Ok(vec![]);
        }

        let label_ids: Vec<u32> = labels.iter().map(|l| l.id).collect();

        // Count albums per label using a raw query approach
        let album_counts: Vec<(u32, u64)> = {
            let albums = crate::models::albums::Entity::find()
                .filter(crate::models::albums::Column::LabelId.is_in(label_ids.clone()))
                .all(db)
                .await?;

            let mut counts = std::collections::HashMap::new();
            for album in albums {
                if let Some(label_id) = album.label_id {
                    *counts.entry(label_id).or_insert(0u64) += 1;
                }
            }
            counts.into_iter().collect()
        };

        let count_map: std::collections::HashMap<u32, u64> = album_counts.into_iter().collect();

        Ok(labels.into_iter().map(|label| {
            LabelResponse {
                id: label.id,
                name: label.name.unwrap_or_default(),
                slug: label.slug.unwrap_or_default(),
                album_count: *count_map.get(&label.id).unwrap_or(&0),
                created_at: label.created.map(|d| d.to_string()),
                updated_at: label.modified.map(|d| d.to_string()),
            }
        }).collect())
    }

    pub async fn get_similar_labels(
        db: &DatabaseConnection,
        params: SimilarityParams,
    ) -> Result<Vec<SimilarResult<LabelModel>>, DbErr> {
        let search_term = &params.search_term;
        let sanitized = crate::utils::slug::sanitize_name(search_term);

        // PHASE 1: Search label_aliases table (for indexed phonetic matches)
        let mut alias_results: Vec<SimilarResult<crate::models::label_aliases::Model>> = Vec::new();

        let alias_query = LabelAlias::find();

        match find_similar_pipeline(
            db,
            alias_query,
            crate::utils::similarity::pipeline::SimilarityColumns {
                name: LabelAliasColumn::AliasKey,
                slug: LabelAliasColumn::Slug,
                sanitized: Some(LabelAliasColumn::SanitizedName),
                soundex: Some(LabelAliasColumn::SoundexKey),
                phonetic: Some(LabelAliasColumn::PhoneticKey),
                metaphone: Some(LabelAliasColumn::MetaphoneKey),
                dmetaphone: Some(LabelAliasColumn::DmetaphoneKey),
                dmetaphone_alt: Some(LabelAliasColumn::DmetaphoneAltKey),
            },
            params.clone(),
            LabelAliasColumn::LabelId,
            |m| m.alias_key.clone(),
        ).await {
            Ok(r) => {
                alias_results = r;
            },
            Err(e) => {
                tracing::warn!("Label alias search error (continuing with direct search): {:?}", e);
            }
        };

        // PHASE 2: Also search labels table directly (catches labels without aliases)
        // This is important because the backfill may not have run yet
        let search_terms = crate::utils::slug::extract_search_terms(search_term);

        let mut conditions = Condition::any();
        // Exact name match (catches exact duplicates even without aliases)
        conditions = conditions.add(LabelColumn::Name.eq(search_term));
        for term in &search_terms {
            conditions = conditions
                .add(LabelColumn::Name.contains(term))
                .add(LabelColumn::Slug.contains(crate::utils::slug::slug_it(term)));
        }
        conditions = conditions.add(LabelColumn::Slug.eq(crate::utils::slug::slug_it(search_term)));

        let direct_labels = Label::find()
            .filter(conditions)
            .limit(500)
            .all(db)
            .await?;

        // Score the direct results using fuzzy matching
        let min_score = params.min_similarity.unwrap_or(40);
        let jw_weight = params.jw_weight.unwrap_or(0.5);
        let dice_weight = params.dice_weight.unwrap_or(0.5);

        let mut direct_results: Vec<SimilarResult<LabelModel>> = Vec::new();
        for label in direct_labels {
            let label_name = label.name.clone().unwrap_or_default();
            let label_name_sanitized = crate::utils::slug::sanitize_name(&label_name);
            if let Some(score) = crate::utils::similarity::pipeline::calculate_similarity_score(
                &sanitized,
                &label_name_sanitized,
                jw_weight,
                dice_weight,
                min_score,
            ) {
                direct_results.push(SimilarResult {
                    model: label,
                    similarity_score: score,
                });
            }
        }

        // Combine alias results with direct results
        let alias_label_ids: Vec<u32> = alias_results.iter().map(|r| r.model.label_id).collect();

        let alias_labels = if !alias_label_ids.is_empty() {
            Label::find()
                .filter(LabelColumn::Id.is_in(alias_label_ids.clone()))
                .all(db)
                .await?
        } else {
            Vec::new()
        };

        // Convert alias results to label results
        let mut final_results: Vec<SimilarResult<LabelModel>> = Vec::new();
        for r in alias_results {
            if let Some(label) = alias_labels.iter().find(|l| l.id == r.model.label_id) {
                final_results.push(SimilarResult {
                    model: label.clone(),
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

        // De-duplicate by label ID
        let mut seen = std::collections::HashSet::new();
        final_results.retain(|r| seen.insert(r.model.id));

        // Limit results (default 20)
        let limit = params.limit.unwrap_or(20);
        final_results.truncate(limit);

        Ok(final_results)
    }

    pub async fn merge_labels(
        db: &DatabaseConnection,
        req: MergeLabelsRequest,
        user_id: Option<u32>,
        ip_address: Option<String>,
    ) -> Result<LabelMergeResult, DbErr> {
        // Validate target
        let into_label = Label::find_by_id(req.into_id).one(db).await?;
        if into_label.is_none() {
            return Err(DbErr::RecordNotFound("Target label not found".to_string()));
        }

        let before_state = serde_json::json!({
            "target_id": req.into_id,
            "source_ids": &req.from_ids,
        });
        let from_ids_for_log = req.from_ids.clone();
        let target_id_for_log = req.into_id;

        let result = db.transaction::<_, LabelMergeResult, DbErr>(|txn| {
            Box::pin(async move {
                let mut stats = LabelMergeStats::default();
                let target_id = req.into_id;
                let from_ids = req.from_ids.clone();

                // 1. Update target fields
                if let Some(obj) = req.merged_data.as_object() {
                    let label = Label::find_by_id(target_id).one(txn).await?
                        .ok_or(DbErr::RecordNotFound("Target label not found".to_string()))?;
                    let mut active_model: crate::models::labels::ActiveModel = label.into();

                    if let Some(name) = obj.get("name").and_then(|v| v.as_str()) {
                        active_model.name = Set(Some(name.to_string()));
                    }
                    if let Some(slug) = obj.get("slug").and_then(|v| v.as_str()) {
                        active_model.slug = Set(Some(slug.to_string()));
                    }

                    active_model.update(txn).await?;
                }

                // 2. Reassign albums.label_id to target
                for from_id in &from_ids {
                    let albums = crate::models::albums::Entity::find()
                        .filter(crate::models::albums::Column::LabelId.eq(*from_id))
                        .all(txn)
                        .await?;

                    for album in albums {
                        let mut active: crate::models::albums::ActiveModel = album.into();
                        active.label_id = Set(Some(target_id));
                        active.update(txn).await?;
                        stats.albums_reassigned += 1;
                    }
                }

                // 3. Label aliases — dedupe by alias_key
                // Use a mutable set so we track aliases moved from earlier source labels too
                let mut existing_aliases: HashSet<String> = LabelAlias::find()
                    .filter(LabelAliasColumn::LabelId.eq(target_id))
                    .all(txn)
                    .await?
                    .into_iter()
                    .map(|a| a.alias_key)
                    .collect();

                for from_id in &from_ids {
                    let aliases = LabelAlias::find()
                        .filter(LabelAliasColumn::LabelId.eq(*from_id))
                        .all(txn)
                        .await?;

                    for alias in aliases {
                        if existing_aliases.contains(&alias.alias_key) {
                            let active: crate::models::label_aliases::ActiveModel = alias.into();
                            active.delete(txn).await?;
                            stats.aliases_deduped += 1;
                        } else {
                            let alias_key = alias.alias_key.clone();
                            let mut active: crate::models::label_aliases::ActiveModel = alias.into();
                            active.label_id = Set(target_id);
                            active.update(txn).await?;
                            existing_aliases.insert(alias_key);
                            stats.aliases_moved += 1;
                        }
                    }
                }

                // 4. Duplicate candidates — delete all involving source labels
                // These are scan results that can be regenerated, so deleting is safe
                // and avoids unique constraint violations during reassignment
                match async {
                    for from_id in &from_ids {
                        let candidates = LabelDuplicateCandidate::find()
                            .filter(
                                Condition::any()
                                    .add(LabelDuplicateCandidateColumn::LabelId1.eq(*from_id))
                                    .add(LabelDuplicateCandidateColumn::LabelId2.eq(*from_id))
                            )
                            .all(txn)
                            .await?;

                        for cand in candidates {
                            let active: crate::models::label_duplicate_candidates::ActiveModel = cand.into();
                            active.delete(txn).await?;
                            stats.duplicate_candidates_cleaned += 1;
                        }
                    }
                    Ok::<(), DbErr>(())
                }.await {
                    Ok(()) => {},
                    Err(e) => {
                        tracing::warn!("Error cleaning duplicate candidates (non-fatal): {:?}", e);
                    }
                }

                // 7. Delete source labels
                for from_id in &from_ids {
                    Label::delete_by_id(*from_id).exec(txn).await?;
                    stats.labels_deleted += 1;
                }

                let merged_label = Label::find_by_id(target_id).one(txn).await?
                    .ok_or(DbErr::RecordNotFound("Merged label not found".to_string()))?;

                Ok(LabelMergeResult {
                    merged_label,
                    stats,
                })
            })
        }).await.map_err(|e| match e {
            TransactionError::Connection(db_err) => db_err,
            TransactionError::Transaction(db_err) => db_err,
        })?;

        let _ = ActionLogService::record_label_merge(
            db,
            target_id_for_log,
            user_id,
            &before_state,
            &result.merged_label,
            &result.stats,
            &from_ids_for_log,
            ip_address,
        ).await;

        Ok(result)
    }
}
