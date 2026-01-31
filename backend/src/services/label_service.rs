use crate::models::labels::{Entity as Label, Model as LabelModel};
use sea_orm::*;
use crate::services::types::{SimilarityParams, SimilarResult};
use crate::utils::similarity::find_similar_pipeline;
use crate::models::label_aliases::{Entity as LabelAlias, Column as LabelAliasColumn};
use crate::models::label_duplicate_candidates::{Entity as LabelDuplicateCandidate, Column as LabelDuplicateCandidateColumn};
use crate::services::action_log_service::ActionLogService;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use std::collections::HashSet;

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
    pub async fn get_similar_labels(
        db: &DatabaseConnection,
        params: SimilarityParams,
    ) -> Result<Vec<SimilarResult<LabelModel>>, DbErr> {
        let query = LabelAlias::find();

        let results: Vec<SimilarResult<crate::models::label_aliases::Model>> = find_similar_pipeline(
            db,
            query,
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
            params,
            LabelAliasColumn::LabelId,
            |m| m.alias_key.clone(),
        ).await?;

        let mut label_ids: Vec<u32> = results.iter().map(|r| r.model.label_id).collect();
        label_ids.sort();
        label_ids.dedup();

        if label_ids.is_empty() {
            return Ok(vec![]);
        }

        let labels = Label::find()
            .filter(crate::models::labels::Column::Id.is_in(label_ids))
            .all(db)
            .await?;

        let mut final_results = Vec::new();
        for r in results {
            if let Some(label) = labels.iter().find(|l| l.id == r.model.label_id) {
                final_results.push(SimilarResult {
                    model: label.clone(),
                    similarity_score: r.similarity_score,
                });
            }
            if final_results.len() >= 50 { break; }
        }

        let mut seen = std::collections::HashSet::new();
        final_results.retain(|r| seen.insert(r.model.id));

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
                let existing_aliases: HashSet<String> = LabelAlias::find()
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
                            let mut active: crate::models::label_aliases::ActiveModel = alias.into();
                            active.label_id = Set(target_id);
                            active.update(txn).await?;
                            stats.aliases_moved += 1;
                        }
                    }
                }

                // 4-6. Duplicate candidates — reassign, remove self-refs, deduplicate pairs
                {
                    for from_id in &from_ids {
                        let candidates_1 = LabelDuplicateCandidate::find()
                            .filter(LabelDuplicateCandidateColumn::LabelId1.eq(*from_id))
                            .all(txn)
                            .await?;

                        for cand in candidates_1 {
                            let mut active: crate::models::label_duplicate_candidates::ActiveModel = cand.into();
                            active.label_id_1 = Set(target_id);
                            active.update(txn).await?;
                            stats.duplicate_candidates_updated += 1;
                        }

                        let candidates_2 = LabelDuplicateCandidate::find()
                            .filter(LabelDuplicateCandidateColumn::LabelId2.eq(*from_id))
                            .all(txn)
                            .await?;

                        for cand in candidates_2 {
                            let mut active: crate::models::label_duplicate_candidates::ActiveModel = cand.into();
                            active.label_id_2 = Set(target_id);
                            active.update(txn).await?;
                            stats.duplicate_candidates_updated += 1;
                        }
                    }

                    // Remove self-refs
                    let self_refs = LabelDuplicateCandidate::find()
                        .filter(LabelDuplicateCandidateColumn::LabelId1.eq(target_id))
                        .filter(LabelDuplicateCandidateColumn::LabelId2.eq(target_id))
                        .all(txn)
                        .await?;

                    for cand in self_refs {
                        let active: crate::models::label_duplicate_candidates::ActiveModel = cand.into();
                        active.delete(txn).await?;
                        stats.duplicate_candidates_cleaned += 1;
                    }

                    // Deduplicate pairs
                    let all_target_candidates = LabelDuplicateCandidate::find()
                        .filter(
                            Condition::any()
                                .add(LabelDuplicateCandidateColumn::LabelId1.eq(target_id))
                                .add(LabelDuplicateCandidateColumn::LabelId2.eq(target_id))
                        )
                        .all(txn)
                        .await?;

                    let mut seen_pairs: HashSet<(u32, u32)> = HashSet::new();
                    for cand in all_target_candidates {
                        let pair = (
                            std::cmp::min(cand.label_id_1, cand.label_id_2),
                            std::cmp::max(cand.label_id_1, cand.label_id_2),
                        );
                        if !seen_pairs.insert(pair) {
                            let active: crate::models::label_duplicate_candidates::ActiveModel = cand.into();
                            active.delete(txn).await?;
                            stats.duplicate_candidates_cleaned += 1;
                        }
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
