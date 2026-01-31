//! Service for detecting and managing duplicate band candidates

use crate::models::band_duplicate_candidates::{
    ActiveModel as CandidateActiveModel, CandidateStatus, Column as CandidateColumn,
    Entity as BandDuplicateCandidate, Model as CandidateModel,
};
use crate::models::bands::{Column as BandColumn, Entity as Band};
use crate::models::duplicate_scan_state::{
    ActiveModel as ScanStateActiveModel, Entity as DuplicateScanState, StopReason,
};
use crate::services::band_service::{BandResponse, BandService};
use crate::services::types::{PaginatedResponse, PaginationInfo, SimilarityParams};
use sea_orm::prelude::Decimal;
use sea_orm::*;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use utoipa::{IntoParams, ToSchema};

pub struct DuplicateScanService;

/// Request to start a duplicate scan
#[derive(Debug, Deserialize, ToSchema, Clone)]
pub struct StartScanRequest {
    pub min_similarity: Option<i32>,
    pub jw_weight: Option<f64>,
    pub dice_weight: Option<f64>,
    pub max_duplicates_to_find: Option<i32>,
    pub batch_size: Option<i32>,
    pub delay_between_batches_ms: Option<i32>,
    pub continuous_mode: Option<bool>,
    pub reset_progress: Option<bool>,
}

/// Response for scan state
#[derive(Debug, Serialize, ToSchema, Clone)]
pub struct ScanStateResponse {
    pub id: u32,
    pub last_processed_band_id: u32,
    pub total_bands_scanned: u32,
    pub duplicates_found: u32,
    pub is_running: bool,
    pub started_at: Option<String>,
    pub stopped_at: Option<String>,
    pub stop_reason: Option<String>,
    pub last_error: Option<String>,
    pub min_similarity: i32,
    pub jw_weight: f64,
    pub dice_weight: f64,
    pub max_duplicates_to_find: i32,
    pub batch_size: i32,
    pub delay_between_batches_ms: i32,
    pub continuous_mode: bool,
    pub continuous_delay_minutes: i32,
    pub total_bands: u64,
    pub progress_percent: f64,
}

/// Response for a duplicate candidate
#[derive(Debug, Serialize, ToSchema, Clone)]
pub struct DuplicateCandidateResponse {
    pub id: u32,
    pub band_1: BandResponse,
    pub band_2: BandResponse,
    pub similarity_score: i32,
    pub match_reasons: Option<serde_json::Value>,
    pub status: String,
    pub reviewed_by: Option<u32>,
    pub reviewed_at: Option<String>,
    pub detected_at: String,
}

/// Lightweight band summary for duplicate checker lists
#[derive(Debug, Serialize, ToSchema, Clone)]
pub struct BandSummary {
    pub id: u32,
    pub name: String,
    pub slug: String,
    pub verified: i8,
    pub approved: i8,
}

/// Response for grouped duplicates (one band with all its matches)
#[derive(Debug, Serialize, ToSchema, Clone)]
pub struct GroupedDuplicateResponse {
    pub band: BandSummary,
    pub match_count: u32,
    pub highest_score: i32,
    pub pending_count: u32,
    pub dismissed_count: u32,
    pub matches: Vec<MatchSummary>,
}

/// Summary of a match within a grouped response
#[derive(Debug, Serialize, ToSchema, Clone)]
pub struct MatchSummary {
    pub candidate_id: u32,
    pub matched_band_id: u32,
    pub matched_band_name: String,
    pub matched_band_slug: String,
    pub similarity_score: i32,
    pub status: String,
}

/// Filter params for listing candidates
#[derive(Debug, Deserialize, IntoParams, Default)]
pub struct CandidateFilterParams {
    pub page: Option<u64>,
    pub page_size: Option<u64>,
    pub status: Option<String>,
    pub min_score: Option<i32>,
    pub max_score: Option<i32>,
    pub band_id: Option<u32>,
}

impl DuplicateScanService {
    /// Get the current scan state
    pub async fn get_scan_state(db: &DatabaseConnection) -> Result<ScanStateResponse, DbErr> {
        let state = DuplicateScanState::find_by_id(1u32)
            .one(db)
            .await?
            .ok_or_else(|| DbErr::RecordNotFound("Scan state not found".to_string()))?;

        // Get total bands count for progress calculation
        let total_bands = Band::find().count(db).await?;
        let progress = if total_bands > 0 {
            (state.total_bands_scanned as f64 / total_bands as f64) * 100.0
        } else {
            0.0
        };

        Ok(ScanStateResponse {
            id: state.id,
            last_processed_band_id: state.last_processed_band_id,
            total_bands_scanned: state.total_bands_scanned,
            duplicates_found: state.duplicates_found,
            is_running: state.is_running,
            started_at: state.started_at.map(|d| d.to_string()),
            stopped_at: state.stopped_at.map(|d| d.to_string()),
            stop_reason: state.stop_reason.clone(),
            last_error: state.last_error.clone(),
            min_similarity: state.min_similarity,
            jw_weight: state.jw_weight.to_string().parse().unwrap_or(0.6),
            dice_weight: state.dice_weight.to_string().parse().unwrap_or(0.4),
            max_duplicates_to_find: state.max_duplicates_to_find,
            batch_size: state.batch_size,
            delay_between_batches_ms: state.delay_between_batches_ms,
            continuous_mode: state.continuous_mode,
            continuous_delay_minutes: state.continuous_delay_minutes,
            total_bands,
            progress_percent: progress,
        })
    }

    /// Start a duplicate scan
    pub async fn start_scan(
        db: &DatabaseConnection,
        request: StartScanRequest,
    ) -> Result<ScanStateResponse, DbErr> {
        // Check if already running
        let state = DuplicateScanState::find_by_id(1u32).one(db).await?;

        if let Some(ref s) = state {
            if s.is_running {
                return Err(DbErr::Custom("Scan is already running".to_string()));
            }
        }

        // Update scan state with new settings
        let now = chrono::Utc::now().naive_utc();
        let mut active_model = ScanStateActiveModel {
            id: Set(1),
            is_running: Set(true),
            started_at: Set(Some(now)),
            stopped_at: Set(None),
            stop_reason: Set(None),
            last_error: Set(None),
            updated_at: Set(now),
            ..Default::default()
        };

        if let Some(min_sim) = request.min_similarity {
            active_model.min_similarity = Set(min_sim);
        }
        if let Some(jw) = request.jw_weight {
            active_model.jw_weight = Set(Decimal::try_from(jw).unwrap_or_default());
        }
        if let Some(dice) = request.dice_weight {
            active_model.dice_weight = Set(Decimal::try_from(dice).unwrap_or_default());
        }
        if let Some(max_dup) = request.max_duplicates_to_find {
            active_model.max_duplicates_to_find = Set(max_dup);
        }
        if let Some(batch) = request.batch_size {
            active_model.batch_size = Set(batch);
        }
        if let Some(delay) = request.delay_between_batches_ms {
            active_model.delay_between_batches_ms = Set(delay);
        }
        if let Some(continuous) = request.continuous_mode {
            active_model.continuous_mode = Set(continuous);
        }
        if request.reset_progress.unwrap_or(false) {
            active_model.last_processed_band_id = Set(0);
            active_model.total_bands_scanned = Set(0);
            active_model.duplicates_found = Set(0);
        }

        active_model.update(db).await?;

        Self::get_scan_state(db).await
    }

    /// Stop a running scan
    pub async fn stop_scan(db: &DatabaseConnection) -> Result<ScanStateResponse, DbErr> {
        let now = chrono::Utc::now().naive_utc();

        let active_model = ScanStateActiveModel {
            id: Set(1),
            is_running: Set(false),
            stopped_at: Set(Some(now)),
            stop_reason: Set(Some(StopReason::UserStopped.to_string())),
            updated_at: Set(now),
            ..Default::default()
        };

        active_model.update(db).await?;
        Self::get_scan_state(db).await
    }

    /// Run the duplicate scan as a background loop, processing batches until complete or stopped.
    pub async fn run_scan_background(db: DatabaseConnection) -> Result<(), DbErr> {
        tracing::info!("Duplicate scan job started");

        loop {
            // Re-read state each iteration so stop_scan takes effect
            let state = DuplicateScanState::find_by_id(1u32)
                .one(&db)
                .await?
                .ok_or_else(|| DbErr::RecordNotFound("Scan state not found".to_string()))?;

            if !state.is_running {
                tracing::info!("Duplicate scan job stopped by user");
                return Ok(());
            }

            let delay_ms = state.delay_between_batches_ms as u64;

            match Self::process_batch(&db).await {
                Ok((_, _, true)) => {
                    tracing::info!("Duplicate scan job completed");
                    return Ok(());
                }
                Ok(_) => {} // continue
                Err(e) => {
                    tracing::error!("Duplicate scan job failed: {}", e);
                    // Mark scan as stopped with error
                    let _ = Self::finalize_scan(
                        &db,
                        crate::models::duplicate_scan_state::StopReason::Error,
                        Some(format!("{}", e)),
                    ).await;
                    return Err(e);
                }
            }

            tokio::time::sleep(tokio::time::Duration::from_millis(delay_ms)).await;
        }
    }

    /// Process a single batch of bands for duplicates
    pub async fn process_batch(db: &DatabaseConnection) -> Result<(u32, u32, bool), DbErr> {
        // Get current state
        let state = DuplicateScanState::find_by_id(1u32)
            .one(db)
            .await?
            .ok_or_else(|| DbErr::RecordNotFound("Scan state not found".to_string()))?;

        if !state.is_running {
            return Ok((0, 0, true)); // Scan stopped
        }

        let batch_size = state.batch_size as u64;
        let min_similarity = state.min_similarity;
        let max_duplicates = state.max_duplicates_to_find as u32;
        let jw_weight = state.jw_weight.to_string().parse().unwrap_or(0.6);
        let dice_weight = state.dice_weight.to_string().parse().unwrap_or(0.4);

        // Check if we've hit the limit
        if state.duplicates_found >= max_duplicates {
            Self::finalize_scan(db, StopReason::LimitReached, None).await?;
            return Ok((0, 0, true));
        }

        // Get next batch of bands
        let bands = Band::find()
            .filter(BandColumn::Id.gt(state.last_processed_band_id))
            .order_by_asc(BandColumn::Id)
            .limit(batch_size)
            .all(db)
            .await?;

        if bands.is_empty() {
            Self::finalize_scan(db, StopReason::Completed, None).await?;
            return Ok((0, 0, true));
        }

        let mut bands_processed = 0u32;
        let mut duplicates_found = 0u32;
        let mut last_band_id = state.last_processed_band_id;

        // Get all existing pairs for this batch to avoid re-processing
        let batch_ids: Vec<u32> = bands.iter().map(|b| b.id).collect();
        let existing_pairs: HashSet<(u32, u32)> = Self::get_existing_pairs(db, &batch_ids).await?;

        for band in bands {
            last_band_id = band.id;
            bands_processed += 1;

            // Search for similar bands
            let params = SimilarityParams {
                search_term: band.name.clone(),
                existing_id: Some(band.id),
                jw_weight: Some(jw_weight),
                dice_weight: Some(dice_weight),
                min_similarity: Some(min_similarity),
                limit: Some(50), // Get more candidates per band
                ..Default::default()
            };

            match BandService::get_similar_bands(db, params).await {
                Ok(similar) => {
                    for result in similar {
                        let other_id = result.model.band.id;
                        if other_id == band.id {
                            continue;
                        }

                        // Ensure canonical ordering (lower ID first)
                        let (id1, id2) = if band.id < other_id {
                            (band.id, other_id)
                        } else {
                            (other_id, band.id)
                        };

                        // Skip if pair already exists
                        if existing_pairs.contains(&(id1, id2)) {
                            continue;
                        }

                        // Insert new candidate
                        let now = chrono::Utc::now().naive_utc();
                        let candidate = CandidateActiveModel {
                            band_id_1: Set(id1),
                            band_id_2: Set(id2),
                            similarity_score: Set(result.similarity_score),
                            match_reasons: Set(Some(serde_json::json!({
                                "score": result.similarity_score,
                                "method": "similarity_pipeline"
                            }))),
                            status: Set(CandidateStatus::Pending.to_string()),
                            detected_at: Set(now),
                            scan_settings: Set(Some(serde_json::json!({
                                "min_similarity": min_similarity,
                                "jw_weight": jw_weight,
                                "dice_weight": dice_weight
                            }))),
                            ..Default::default()
                        };

                        // Use INSERT IGNORE to handle race conditions
                        match candidate.insert(db).await {
                            Ok(_) => duplicates_found += 1,
                            Err(DbErr::Query(RuntimeErr::SqlxError(ref arc_err))) => {
                                // Check if it's a duplicate key error (MySQL error 1062)
                                let is_duplicate = format!("{:?}", arc_err)
                                    .contains("1062")
                                    || format!("{:?}", arc_err).contains("Duplicate entry");
                                if !is_duplicate {
                                    tracing::warn!("Failed to insert candidate: {:?}", arc_err);
                                }
                            }
                            Err(e) => {
                                tracing::warn!("Failed to insert candidate: {:?}", e);
                            }
                        }

                        // Check limit
                        if state.duplicates_found + duplicates_found >= max_duplicates {
                            break;
                        }
                    }
                }
                Err(e) => {
                    tracing::warn!("Error finding similar bands for {}: {:?}", band.id, e);
                }
            }

            // Check if we hit the limit
            if state.duplicates_found + duplicates_found >= max_duplicates {
                break;
            }
        }

        // Update progress
        let now = chrono::Utc::now().naive_utc();
        let update = ScanStateActiveModel {
            id: Set(1),
            last_processed_band_id: Set(last_band_id),
            total_bands_scanned: Set(state.total_bands_scanned + bands_processed),
            duplicates_found: Set(state.duplicates_found + duplicates_found),
            updated_at: Set(now),
            ..Default::default()
        };
        update.update(db).await?;

        Ok((bands_processed, duplicates_found, false))
    }

    /// Helper to get existing pairs for a set of band IDs
    async fn get_existing_pairs(
        db: &DatabaseConnection,
        band_ids: &[u32],
    ) -> Result<HashSet<(u32, u32)>, DbErr> {
        let candidates = BandDuplicateCandidate::find()
            .filter(
                Condition::any()
                    .add(CandidateColumn::BandId1.is_in(band_ids.to_vec()))
                    .add(CandidateColumn::BandId2.is_in(band_ids.to_vec())),
            )
            .all(db)
            .await?;

        Ok(candidates
            .into_iter()
            .map(|c| (c.band_id_1, c.band_id_2))
            .collect())
    }

    /// Finalize a scan run
    async fn finalize_scan(
        db: &DatabaseConnection,
        reason: StopReason,
        error: Option<String>,
    ) -> Result<(), DbErr> {
        let now = chrono::Utc::now().naive_utc();
        let update = ScanStateActiveModel {
            id: Set(1),
            is_running: Set(false),
            stopped_at: Set(Some(now)),
            stop_reason: Set(Some(reason.to_string())),
            last_error: Set(error),
            updated_at: Set(now),
            ..Default::default()
        };
        update.update(db).await?;
        Ok(())
    }

    /// Get duplicate candidates (paginated)
    pub async fn get_candidates(
        db: &DatabaseConnection,
        params: CandidateFilterParams,
    ) -> Result<PaginatedResponse<DuplicateCandidateResponse>, DbErr> {
        let page = params.page.unwrap_or(1);
        let page_size = params.page_size.unwrap_or(20);

        let mut query = BandDuplicateCandidate::find();

        if let Some(ref status) = params.status {
            query = query.filter(CandidateColumn::Status.eq(status));
        }
        if let Some(min) = params.min_score {
            query = query.filter(CandidateColumn::SimilarityScore.gte(min));
        }
        if let Some(max) = params.max_score {
            query = query.filter(CandidateColumn::SimilarityScore.lte(max));
        }
        if let Some(band_id) = params.band_id {
            query = query.filter(
                Condition::any()
                    .add(CandidateColumn::BandId1.eq(band_id))
                    .add(CandidateColumn::BandId2.eq(band_id)),
            );
        }

        query = query.order_by_desc(CandidateColumn::SimilarityScore);

        let total = query.clone().count(db).await?;
        let total_pages = (total as f64 / page_size as f64).ceil() as u64;

        let candidates = query
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all(db)
            .await?;

        // Load band details for each candidate
        let mut results = Vec::new();
        for candidate in candidates {
            let band1 = BandService::get_band_by_id(db, candidate.band_id_1).await?;
            let band2 = BandService::get_band_by_id(db, candidate.band_id_2).await?;

            if let (Some(b1), Some(b2)) = (band1, band2) {
                results.push(DuplicateCandidateResponse {
                    id: candidate.id,
                    band_1: b1,
                    band_2: b2,
                    similarity_score: candidate.similarity_score,
                    match_reasons: candidate.match_reasons,
                    status: candidate.status,
                    reviewed_by: candidate.reviewed_by,
                    reviewed_at: candidate.reviewed_at.map(|d| d.to_string()),
                    detected_at: candidate.detected_at.to_string(),
                });
            }
        }

        Ok(PaginatedResponse {
            results,
            pagination: PaginationInfo {
                page,
                page_size,
                total_pages,
                total_items: total,
            },
        })
    }

    /// Get candidates grouped by band
    pub async fn get_candidates_grouped(
        db: &DatabaseConnection,
        params: CandidateFilterParams,
    ) -> Result<PaginatedResponse<GroupedDuplicateResponse>, DbErr> {
        let page = params.page.unwrap_or(1);
        let page_size = params.page_size.unwrap_or(20);

        // Get unique band IDs that have candidates (using band_id_1 as the primary grouping)
        let mut query = BandDuplicateCandidate::find();

        if let Some(ref status) = params.status {
            query = query.filter(CandidateColumn::Status.eq(status));
        }
        if let Some(min) = params.min_score {
            query = query.filter(CandidateColumn::SimilarityScore.gte(min));
        }
        if let Some(max) = params.max_score {
            query = query.filter(CandidateColumn::SimilarityScore.lte(max));
        }

        // Get all candidates first, then group in memory
        // (More efficient would be a raw SQL GROUP BY, but this works for now)
        let all_candidates = query
            .order_by_desc(CandidateColumn::SimilarityScore)
            .all(db)
            .await?;

        // Group by band_id_1
        let mut grouped: std::collections::HashMap<u32, Vec<CandidateModel>> =
            std::collections::HashMap::new();
        for candidate in all_candidates {
            grouped
                .entry(candidate.band_id_1)
                .or_default()
                .push(candidate);
        }

        let total = grouped.len() as u64;
        let total_pages = (total as f64 / page_size as f64).ceil() as u64;

        // Sort by highest score in group
        let mut sorted_groups: Vec<(u32, Vec<CandidateModel>)> = grouped.into_iter().collect();
        sorted_groups.sort_by(|a, b| {
            let max_a = a.1.iter().map(|c| c.similarity_score).max().unwrap_or(0);
            let max_b = b.1.iter().map(|c| c.similarity_score).max().unwrap_or(0);
            max_b.cmp(&max_a)
        });

        // Paginate
        let start = ((page - 1) * page_size) as usize;
        let end = (start + page_size as usize).min(sorted_groups.len());
        let page_groups = if start < sorted_groups.len() {
            &sorted_groups[start..end]
        } else {
            &[]
        };

        // Collect all band IDs we need (primary bands + matched bands)
        let mut all_band_ids: Vec<u32> = page_groups.iter().map(|(id, _)| *id).collect();
        for (_, candidates) in page_groups {
            for c in candidates {
                all_band_ids.push(c.band_id_2);
            }
        }
        all_band_ids.sort();
        all_band_ids.dedup();

        // Batch load all bands at once (lightweight query, no relations)
        let bands_map: std::collections::HashMap<u32, _> = Band::find()
            .filter(BandColumn::Id.is_in(all_band_ids))
            .all(db)
            .await?
            .into_iter()
            .map(|b| (b.id, b))
            .collect();

        // Build response
        let mut results = Vec::new();
        for (band_id, candidates) in page_groups {
            if let Some(band_model) = bands_map.get(band_id) {
                let band = BandSummary {
                    id: band_model.id,
                    name: band_model.name.clone(),
                    slug: band_model.slug.clone().unwrap_or_default(),
                    verified: band_model.verified,
                    approved: band_model.approved,
                };

                let match_count = candidates.len() as u32;
                let highest_score = candidates
                    .iter()
                    .map(|c| c.similarity_score)
                    .max()
                    .unwrap_or(0);
                let pending_count = candidates
                    .iter()
                    .filter(|c| c.status == "pending")
                    .count() as u32;
                let dismissed_count = candidates
                    .iter()
                    .filter(|c| c.status == "dismissed")
                    .count() as u32;

                // Get match summaries (using pre-loaded bands)
                let matches: Vec<MatchSummary> = candidates
                    .iter()
                    .map(|candidate| {
                        let other_band = bands_map.get(&candidate.band_id_2);
                        let other_name = other_band
                            .map(|b| b.name.clone())
                            .unwrap_or_else(|| "Unknown".to_string());
                        let other_slug = other_band
                            .and_then(|b| b.slug.clone())
                            .unwrap_or_default();

                        MatchSummary {
                            candidate_id: candidate.id,
                            matched_band_id: candidate.band_id_2,
                            matched_band_name: other_name,
                            matched_band_slug: other_slug,
                            similarity_score: candidate.similarity_score,
                            status: candidate.status.clone(),
                        }
                    })
                    .collect();

                results.push(GroupedDuplicateResponse {
                    band,
                    match_count,
                    highest_score,
                    pending_count,
                    dismissed_count,
                    matches,
                });
            }
        }

        Ok(PaginatedResponse {
            results,
            pagination: PaginationInfo {
                page,
                page_size,
                total_pages,
                total_items: total,
            },
        })
    }

    /// Update candidate status
    pub async fn update_candidate_status(
        db: &DatabaseConnection,
        candidate_id: u32,
        status: CandidateStatus,
        user_id: Option<u32>,
    ) -> Result<CandidateModel, DbErr> {
        let now = chrono::Utc::now().naive_utc();

        let update = CandidateActiveModel {
            id: Set(candidate_id),
            status: Set(status.to_string()),
            reviewed_by: Set(user_id),
            reviewed_at: Set(Some(now)),
            ..Default::default()
        };

        update.update(db).await
    }

    /// Restore a dismissed candidate to pending
    pub async fn restore_candidate(
        db: &DatabaseConnection,
        candidate_id: u32,
    ) -> Result<CandidateModel, DbErr> {
        let update = CandidateActiveModel {
            id: Set(candidate_id),
            status: Set(CandidateStatus::Pending.to_string()),
            reviewed_by: Set(None),
            reviewed_at: Set(None),
            ..Default::default()
        };

        update.update(db).await
    }

    /// Clear all candidates (optionally only pending ones)
    pub async fn clear_candidates(
        db: &DatabaseConnection,
        pending_only: bool,
    ) -> Result<u64, DbErr> {
        let mut delete = BandDuplicateCandidate::delete_many();

        if pending_only {
            delete = delete.filter(CandidateColumn::Status.eq("pending"));
        }

        let result = delete.exec(db).await?;
        Ok(result.rows_affected)
    }

    /// Get all matches for a specific band (for the Review modal)
    pub async fn get_band_matches(
        db: &DatabaseConnection,
        band_id: u32,
    ) -> Result<Vec<DuplicateCandidateResponse>, DbErr> {
        let candidates = BandDuplicateCandidate::find()
            .filter(
                Condition::any()
                    .add(CandidateColumn::BandId1.eq(band_id))
                    .add(CandidateColumn::BandId2.eq(band_id)),
            )
            .order_by_desc(CandidateColumn::SimilarityScore)
            .all(db)
            .await?;

        let mut results = Vec::new();
        for candidate in candidates {
            let band1 = BandService::get_band_by_id(db, candidate.band_id_1).await?;
            let band2 = BandService::get_band_by_id(db, candidate.band_id_2).await?;

            if let (Some(b1), Some(b2)) = (band1, band2) {
                results.push(DuplicateCandidateResponse {
                    id: candidate.id,
                    band_1: b1,
                    band_2: b2,
                    similarity_score: candidate.similarity_score,
                    match_reasons: candidate.match_reasons,
                    status: candidate.status,
                    reviewed_by: candidate.reviewed_by,
                    reviewed_at: candidate.reviewed_at.map(|d| d.to_string()),
                    detected_at: candidate.detected_at.to_string(),
                });
            }
        }

        Ok(results)
    }
}
