//! Service for detecting and managing duplicate candidates across entity types

use crate::models::band_duplicate_candidates::CandidateStatus;
use crate::models::duplicate_scan_state::{
    ActiveModel as ScanStateActiveModel, Column as ScanStateColumn,
    Entity as DuplicateScanState, ScanEntityType, StopReason,
};
use crate::services::duplicate_scan_entity::{
    AlbumScanEntity, BandScanEntity, DuplicateScanEntity, LabelScanEntity,
    RadioStationScanEntity, SongScanEntity, StaffMemberScanEntity,
};
use crate::services::types::{PaginatedResponse, PaginationInfo};
use sea_orm::prelude::Decimal;
use sea_orm::*;
use serde::{Deserialize, Serialize};
use tokio_util::sync::CancellationToken;
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
    pub entity_type: String,
    pub last_processed_id: u32,
    pub total_items_scanned: u32,
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
    pub total_items: u64,
    pub progress_percent: f64,
}

/// Lightweight entity summary for duplicate checker lists
#[derive(Debug, Serialize, ToSchema, Clone)]
pub struct EntitySummary {
    pub id: u32,
    pub name: String,
    pub slug: String,
    pub verified: i8,
    pub approved: i8,
}

/// Response for grouped duplicates (one entity with all its matches)
#[derive(Debug, Serialize, ToSchema, Clone)]
pub struct GroupedDuplicateResponse {
    pub entity: EntitySummary,
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
    pub matched_entity_id: u32,
    pub matched_entity_name: String,
    pub matched_entity_slug: String,
    pub similarity_score: i32,
    pub status: String,
}

/// Pending count per entity type for the summary endpoint
#[derive(Debug, Serialize, ToSchema, Clone)]
pub struct EntityPendingCount {
    pub entity_type: String,
    pub pending_count: u64,
}

/// Filter params for listing candidates
#[derive(Debug, Deserialize, IntoParams, Default)]
pub struct CandidateFilterParams {
    pub page: Option<u64>,
    pub page_size: Option<u64>,
    pub status: Option<String>,
    pub min_score: Option<i32>,
    pub max_score: Option<i32>,
    pub entity_id: Option<u32>,
}

/// Generic candidate row used across all entity types
#[derive(Debug, Clone, serde::Serialize)]
pub struct GenericCandidate {
    pub id: u32,
    pub entity_id_1: u32,
    pub entity_id_2: u32,
    pub similarity_score: i32,
    pub match_reasons: Option<serde_json::Value>,
    pub status: String,
    pub reviewed_by: Option<u32>,
    pub reviewed_at: Option<chrono::NaiveDateTime>,
    pub detected_at: chrono::NaiveDateTime,
}

// ──────────────────────────── GenericCandidate From impls ────────────────────────────

impl From<crate::models::band_duplicate_candidates::Model> for GenericCandidate {
    fn from(c: crate::models::band_duplicate_candidates::Model) -> Self {
        Self {
            id: c.id, entity_id_1: c.band_id_1, entity_id_2: c.band_id_2,
            similarity_score: c.similarity_score, match_reasons: c.match_reasons,
            status: c.status, reviewed_by: c.reviewed_by, reviewed_at: c.reviewed_at,
            detected_at: c.detected_at,
        }
    }
}

impl From<crate::models::album_duplicate_candidates::Model> for GenericCandidate {
    fn from(c: crate::models::album_duplicate_candidates::Model) -> Self {
        Self {
            id: c.id, entity_id_1: c.album_id_1, entity_id_2: c.album_id_2,
            similarity_score: c.similarity_score, match_reasons: c.match_reasons,
            status: c.status, reviewed_by: c.reviewed_by, reviewed_at: c.reviewed_at,
            detected_at: c.detected_at,
        }
    }
}

impl From<crate::models::label_duplicate_candidates::Model> for GenericCandidate {
    fn from(c: crate::models::label_duplicate_candidates::Model) -> Self {
        Self {
            id: c.id, entity_id_1: c.label_id_1, entity_id_2: c.label_id_2,
            similarity_score: c.similarity_score, match_reasons: c.match_reasons,
            status: c.status, reviewed_by: c.reviewed_by, reviewed_at: c.reviewed_at,
            detected_at: c.detected_at,
        }
    }
}

impl From<crate::models::radio_station_duplicate_candidates::Model> for GenericCandidate {
    fn from(c: crate::models::radio_station_duplicate_candidates::Model) -> Self {
        Self {
            id: c.id, entity_id_1: c.radio_station_id_1, entity_id_2: c.radio_station_id_2,
            similarity_score: c.similarity_score, match_reasons: c.match_reasons,
            status: c.status, reviewed_by: c.reviewed_by, reviewed_at: c.reviewed_at,
            detected_at: c.detected_at,
        }
    }
}

impl From<crate::models::staff_member_duplicate_candidates::Model> for GenericCandidate {
    fn from(c: crate::models::staff_member_duplicate_candidates::Model) -> Self {
        Self {
            id: c.id, entity_id_1: c.staff_member_id_1, entity_id_2: c.staff_member_id_2,
            similarity_score: c.similarity_score, match_reasons: c.match_reasons,
            status: c.status, reviewed_by: c.reviewed_by, reviewed_at: c.reviewed_at,
            detected_at: c.detected_at,
        }
    }
}

impl From<crate::models::song_duplicate_candidates::Model> for GenericCandidate {
    fn from(c: crate::models::song_duplicate_candidates::Model) -> Self {
        Self {
            id: c.id, entity_id_1: c.song_id_1, entity_id_2: c.song_id_2,
            similarity_score: c.similarity_score, match_reasons: c.match_reasons,
            status: c.status, reviewed_by: c.reviewed_by, reviewed_at: c.reviewed_at,
            detected_at: c.detected_at,
        }
    }
}

// ──────────────────────────── Entity type dispatch macro ────────────────────────────

/// Dispatches to the correct DuplicateScanEntity implementation based on entity_type.
macro_rules! dispatch_entity {
    ($entity_type:expr, $method:ident ( $($arg:expr),* $(,)? )) => {
        match $entity_type {
            ScanEntityType::Bands => BandScanEntity::$method($($arg),*).await,
            ScanEntityType::Albums => AlbumScanEntity::$method($($arg),*).await,
            ScanEntityType::Labels => LabelScanEntity::$method($($arg),*).await,
            ScanEntityType::RadioStations => RadioStationScanEntity::$method($($arg),*).await,
            ScanEntityType::StaffMembers => StaffMemberScanEntity::$method($($arg),*).await,
            ScanEntityType::Songs => SongScanEntity::$method($($arg),*).await,
        }
    };
}

impl DuplicateScanService {
    // ──────────────────────────── helpers ────────────────────────────

    /// Find scan state row by entity type, creating a default if none exists
    async fn find_state(
        db: &DatabaseConnection,
        entity_type: &ScanEntityType,
    ) -> Result<crate::models::duplicate_scan_state::Model, DbErr> {
        if let Some(state) = DuplicateScanState::find()
            .filter(ScanStateColumn::EntityType.eq(entity_type.to_string()))
            .one(db)
            .await?
        {
            return Ok(state);
        }

        let now = chrono::Utc::now().naive_utc();
        let new_state = ScanStateActiveModel {
            entity_type: Set(entity_type.to_string()),
            last_processed_id: Set(0),
            total_items_scanned: Set(0),
            duplicates_found: Set(0),
            is_running: Set(false),
            started_at: Set(None),
            stopped_at: Set(None),
            stop_reason: Set(None),
            last_error: Set(None),
            min_similarity: Set(95),
            jw_weight: Set(Decimal::new(60, 2)),
            dice_weight: Set(Decimal::new(40, 2)),
            max_duplicates_to_find: Set(0),
            batch_size: Set(100),
            delay_between_batches_ms: Set(50),
            continuous_mode: Set(false),
            continuous_delay_minutes: Set(30),
            updated_at: Set(now),
            ..Default::default()
        };
        Ok(new_state.insert(db).await?)
    }

    fn build_scan_state_response(
        state: &crate::models::duplicate_scan_state::Model,
        total_items: u64,
    ) -> ScanStateResponse {
        let progress = if total_items > 0 {
            (state.total_items_scanned as f64 / total_items as f64) * 100.0
        } else {
            0.0
        };
        ScanStateResponse {
            id: state.id,
            entity_type: state.entity_type.clone(),
            last_processed_id: state.last_processed_id,
            total_items_scanned: state.total_items_scanned,
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
            total_items,
            progress_percent: progress,
        }
    }

    // ──────────────────────────── scan state ────────────────────────────

    pub async fn get_scan_state(
        db: &DatabaseConnection,
        entity_type: &ScanEntityType,
    ) -> Result<ScanStateResponse, DbErr> {
        let state = Self::find_state(db, entity_type).await?;
        let total_items = dispatch_entity!(entity_type, count_all(db));
        let total_items = total_items?;
        Ok(Self::build_scan_state_response(&state, total_items))
    }

    pub async fn get_all_running_scan_states(
        db: &DatabaseConnection,
    ) -> Result<Vec<ScanStateResponse>, DbErr> {
        let states = DuplicateScanState::find()
            .filter(ScanStateColumn::IsRunning.eq(true))
            .all(db)
            .await?;

        let mut results = Vec::new();
        for state in states {
            if let Ok(entity_type) = state.entity_type.parse::<ScanEntityType>() {
                let total_items = dispatch_entity!(&entity_type, count_all(db))?;
                results.push(Self::build_scan_state_response(&state, total_items));
            }
        }
        Ok(results)
    }

    // ──────────────────────────── start / stop ────────────────────────────

    pub async fn start_scan(
        db: &DatabaseConnection,
        entity_type: &ScanEntityType,
        request: StartScanRequest,
    ) -> Result<ScanStateResponse, DbErr> {
        let state = Self::find_state(db, entity_type).await?;

        if state.is_running {
            return Err(DbErr::Custom(format!(
                "Scan is already running for {}",
                entity_type.display_name()
            )));
        }

        let now = chrono::Utc::now().naive_utc();
        let mut active_model = ScanStateActiveModel {
            id: Set(state.id),
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
        // Always reset counters so "Duplicates Found" reflects this scan only
        active_model.total_items_scanned = Set(0);
        active_model.duplicates_found = Set(0);

        // Auto-reset scan position if previous scan completed (nothing to resume)
        // or if explicitly requested
        let prev_completed = state.stop_reason.as_deref() == Some("completed");
        if request.reset_progress.unwrap_or(false) || prev_completed {
            active_model.last_processed_id = Set(0);
        }

        active_model.update(db).await?;
        Self::get_scan_state(db, entity_type).await
    }

    pub async fn stop_scan(
        db: &DatabaseConnection,
        entity_type: &ScanEntityType,
    ) -> Result<ScanStateResponse, DbErr> {
        let state = Self::find_state(db, entity_type).await?;
        let now = chrono::Utc::now().naive_utc();
        let active_model = ScanStateActiveModel {
            id: Set(state.id),
            is_running: Set(false),
            stopped_at: Set(Some(now)),
            stop_reason: Set(Some(StopReason::UserStopped.to_string())),
            updated_at: Set(now),
            ..Default::default()
        };
        active_model.update(db).await?;
        Self::get_scan_state(db, entity_type).await
    }

    // ──────────────────────────── background scan ────────────────────────────

    pub async fn run_scan_background(
        db: DatabaseConnection,
        entity_type: ScanEntityType,
        cancel_token: CancellationToken,
    ) -> Result<(), DbErr> {
        tracing::info!("Duplicate scan job started for {}", entity_type.display_name());

        loop {
            if cancel_token.is_cancelled() {
                tracing::info!("Duplicate scan job cancelled for {}", entity_type.display_name());
                let _ = Self::finalize_scan(&db, &entity_type, StopReason::UserStopped, None).await;
                return Ok(());
            }

            let state = Self::find_state(&db, &entity_type).await?;
            if !state.is_running {
                tracing::info!("Duplicate scan job stopped by user for {}", entity_type.display_name());
                return Ok(());
            }

            let delay_ms = state.delay_between_batches_ms as u64;

            match Self::process_batch(&db, &entity_type).await {
                Ok((_, _, true)) => {
                    tracing::info!("Duplicate scan job completed for {}", entity_type.display_name());
                    return Ok(());
                }
                Ok(_) => {}
                Err(e) => {
                    tracing::error!("Duplicate scan job failed for {}: {}", entity_type.display_name(), e);
                    let _ = Self::finalize_scan(&db, &entity_type, StopReason::Error, Some(format!("{}", e))).await;
                    return Err(e);
                }
            }

            tokio::select! {
                _ = cancel_token.cancelled() => {
                    tracing::info!("Duplicate scan job cancelled during sleep for {}", entity_type.display_name());
                    let _ = Self::finalize_scan(&db, &entity_type, StopReason::UserStopped, None).await;
                    return Ok(());
                }
                _ = tokio::time::sleep(tokio::time::Duration::from_millis(delay_ms)) => {}
            }
        }
    }

    // ──────────────────────────── generic batch processing ────────────────────────────

    pub async fn process_batch(
        db: &DatabaseConnection,
        entity_type: &ScanEntityType,
    ) -> Result<(u32, u32, bool), DbErr> {
        let state = Self::find_state(db, entity_type).await?;
        if !state.is_running {
            return Ok((0, 0, true));
        }

        let batch_size = state.batch_size as u64;
        let min_similarity = state.min_similarity;
        let max_duplicates = state.max_duplicates_to_find as u32;
        let jw_weight: f64 = state.jw_weight.to_string().parse().unwrap_or(0.6);
        let dice_weight: f64 = state.dice_weight.to_string().parse().unwrap_or(0.4);

        if max_duplicates > 0 && state.duplicates_found >= max_duplicates {
            Self::finalize_scan(db, entity_type, StopReason::LimitReached, None).await?;
            return Ok((0, 0, true));
        }

        match entity_type {
            ScanEntityType::Bands => Self::process_batch_for::<BandScanEntity>(db, &state, entity_type, batch_size, min_similarity, max_duplicates, jw_weight, dice_weight).await,
            ScanEntityType::Albums => Self::process_batch_for::<AlbumScanEntity>(db, &state, entity_type, batch_size, min_similarity, max_duplicates, jw_weight, dice_weight).await,
            ScanEntityType::Labels => Self::process_batch_for::<LabelScanEntity>(db, &state, entity_type, batch_size, min_similarity, max_duplicates, jw_weight, dice_weight).await,
            ScanEntityType::RadioStations => Self::process_batch_for::<RadioStationScanEntity>(db, &state, entity_type, batch_size, min_similarity, max_duplicates, jw_weight, dice_weight).await,
            ScanEntityType::StaffMembers => Self::process_batch_for::<StaffMemberScanEntity>(db, &state, entity_type, batch_size, min_similarity, max_duplicates, jw_weight, dice_weight).await,
            ScanEntityType::Songs => Self::process_batch_for::<SongScanEntity>(db, &state, entity_type, batch_size, min_similarity, max_duplicates, jw_weight, dice_weight).await,
        }
    }

    /// Generic batch processor that works with any DuplicateScanEntity implementation.
    async fn process_batch_for<E: DuplicateScanEntity>(
        db: &DatabaseConnection,
        state: &crate::models::duplicate_scan_state::Model,
        entity_type: &ScanEntityType,
        batch_size: u64,
        min_similarity: i32,
        max_duplicates: u32,
        jw_weight: f64,
        dice_weight: f64,
    ) -> Result<(u32, u32, bool), DbErr> {
        let batch = E::fetch_batch(db, state.last_processed_id, batch_size).await?;

        if batch.is_empty() {
            Self::finalize_scan(db, entity_type, StopReason::Completed, None).await?;
            return Ok((0, 0, true));
        }

        let mut items_processed = 0u32;
        let mut duplicates_found = 0u32;
        let mut last_id = state.last_processed_id;

        let batch_ids: Vec<u32> = batch.iter().map(|(id, _)| *id).collect();
        let existing_pairs = E::get_existing_pairs(db, &batch_ids).await?;

        for (entity_id, name) in &batch {
            last_id = *entity_id;
            items_processed += 1;

            match E::find_similar(db, *entity_id, name, jw_weight, dice_weight, min_similarity).await {
                Ok(similar) => {
                    for (other_id, score) in similar {
                        if other_id == *entity_id {
                            continue;
                        }
                        let (id1, id2) = if *entity_id < other_id {
                            (*entity_id, other_id)
                        } else {
                            (other_id, *entity_id)
                        };
                        if existing_pairs.contains(&(id1, id2)) {
                            continue;
                        }

                        match E::insert_candidate(db, id1, id2, score, min_similarity, jw_weight, dice_weight).await {
                            Ok(true) => duplicates_found += 1,
                            Ok(false) => {} // duplicate key, skip
                            Err(e) => tracing::warn!("Failed to insert candidate: {:?}", e),
                        }

                        if max_duplicates > 0 && state.duplicates_found + duplicates_found >= max_duplicates {
                            break;
                        }
                    }
                }
                Err(e) => {
                    tracing::warn!("Error finding similar entities for {}: {:?}", entity_id, e);
                }
            }

            if max_duplicates > 0 && state.duplicates_found + duplicates_found >= max_duplicates {
                break;
            }
        }

        Self::update_progress(db, entity_type, state, last_id, items_processed, duplicates_found).await?;
        Ok((items_processed, duplicates_found, false))
    }

    // ──────────────────────────── progress helpers ────────────────────────────

    async fn update_progress(
        db: &DatabaseConnection,
        _entity_type: &ScanEntityType,
        state: &crate::models::duplicate_scan_state::Model,
        last_id: u32,
        items_processed: u32,
        duplicates_found: u32,
    ) -> Result<(), DbErr> {
        let now = chrono::Utc::now().naive_utc();
        let update = ScanStateActiveModel {
            id: Set(state.id),
            last_processed_id: Set(last_id),
            total_items_scanned: Set(state.total_items_scanned + items_processed),
            duplicates_found: Set(state.duplicates_found + duplicates_found),
            updated_at: Set(now),
            ..Default::default()
        };
        update.update(db).await?;
        Ok(())
    }

    async fn finalize_scan(
        db: &DatabaseConnection,
        entity_type: &ScanEntityType,
        reason: StopReason,
        error: Option<String>,
    ) -> Result<(), DbErr> {
        let state = Self::find_state(db, entity_type).await?;
        let now = chrono::Utc::now().naive_utc();
        let update = ScanStateActiveModel {
            id: Set(state.id),
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

    // ──────────────────────────── candidates CRUD ────────────────────────────

    pub async fn get_candidates_grouped(
        db: &DatabaseConnection,
        entity_type: &ScanEntityType,
        params: CandidateFilterParams,
    ) -> Result<PaginatedResponse<GroupedDuplicateResponse>, DbErr> {
        let page = params.page.unwrap_or(1);
        let page_size = params.page_size.unwrap_or(20);

        // Use DB-level GROUP BY pagination — only fetches candidates for the current page
        let (total, page_candidates) = dispatch_entity!(entity_type, fetch_grouped_page(db, &params, page, page_size))?;
        let total_pages = (total as f64 / page_size as f64).ceil() as u64;

        // Group the page candidates by entity_id_1
        let mut grouped: std::collections::HashMap<u32, Vec<GenericCandidate>> =
            std::collections::HashMap::new();
        for candidate in page_candidates {
            grouped.entry(candidate.entity_id_1).or_default().push(candidate);
        }

        // Collect all entity IDs we need for summaries
        let mut all_entity_ids: Vec<u32> = Vec::new();
        for (entity_id, candidates) in &grouped {
            all_entity_ids.push(*entity_id);
            for c in candidates {
                all_entity_ids.push(c.entity_id_2);
            }
        }
        all_entity_ids.sort();
        all_entity_ids.dedup();

        let entity_map = dispatch_entity!(entity_type, load_summaries(db, &all_entity_ids))?;

        // Build response — sort by highest score to match the DB ordering
        let mut sorted_groups: Vec<(u32, Vec<GenericCandidate>)> = grouped.into_iter().collect();
        sorted_groups.sort_by(|a, b| {
            let max_a = a.1.iter().map(|c| c.similarity_score).max().unwrap_or(0);
            let max_b = b.1.iter().map(|c| c.similarity_score).max().unwrap_or(0);
            max_b.cmp(&max_a)
        });

        let mut results = Vec::new();
        for (entity_id, candidates) in &sorted_groups {
            if let Some(entity_summary) = entity_map.get(entity_id) {
                let match_count = candidates.len() as u32;
                let highest_score = candidates.iter().map(|c| c.similarity_score).max().unwrap_or(0);
                let pending_count = candidates.iter().filter(|c| c.status == "pending").count() as u32;
                let dismissed_count = candidates.iter().filter(|c| c.status == "dismissed").count() as u32;

                let matches: Vec<MatchSummary> = candidates
                    .iter()
                    .map(|candidate| {
                        let other = entity_map.get(&candidate.entity_id_2);
                        MatchSummary {
                            candidate_id: candidate.id,
                            matched_entity_id: candidate.entity_id_2,
                            matched_entity_name: other.map(|e| e.name.clone()).unwrap_or_else(|| "Unknown".to_string()),
                            matched_entity_slug: other.map(|e| e.slug.clone()).unwrap_or_default(),
                            similarity_score: candidate.similarity_score,
                            status: candidate.status.clone(),
                        }
                    })
                    .collect();

                results.push(GroupedDuplicateResponse {
                    entity: entity_summary.clone(),
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

    pub async fn update_candidate_status(
        db: &DatabaseConnection,
        entity_type: &ScanEntityType,
        candidate_id: u32,
        status: CandidateStatus,
        user_id: Option<u32>,
    ) -> Result<(), DbErr> {
        dispatch_entity!(entity_type, update_status(db, candidate_id, status, user_id))
    }

    pub async fn restore_candidate(
        db: &DatabaseConnection,
        entity_type: &ScanEntityType,
        candidate_id: u32,
    ) -> Result<(), DbErr> {
        dispatch_entity!(entity_type, restore(db, candidate_id))
    }

    pub async fn clear_candidates(
        db: &DatabaseConnection,
        entity_type: &ScanEntityType,
        pending_only: bool,
    ) -> Result<u64, DbErr> {
        dispatch_entity!(entity_type, clear(db, pending_only))
    }

    pub async fn get_entity_matches(
        db: &DatabaseConnection,
        entity_type: &ScanEntityType,
        entity_id: u32,
    ) -> Result<Vec<GenericCandidate>, DbErr> {
        dispatch_entity!(entity_type, get_matches(db, entity_id))
    }

    /// Returns the count of pending candidates for each entity type.
    pub async fn get_pending_summary(
        db: &DatabaseConnection,
    ) -> Result<Vec<EntityPendingCount>, DbErr> {
        let entity_types = [
            ScanEntityType::Bands,
            ScanEntityType::Albums,
            ScanEntityType::Songs,
            ScanEntityType::Labels,
            ScanEntityType::RadioStations,
            ScanEntityType::StaffMembers,
        ];

        let mut results = Vec::with_capacity(entity_types.len());
        for et in &entity_types {
            let params = CandidateFilterParams {
                status: Some("pending".to_string()),
                page: Some(1),
                page_size: Some(1),
                ..Default::default()
            };
            let grouped = Self::get_candidates_grouped(db, et, params).await?;
            results.push(EntityPendingCount {
                entity_type: et.to_string(),
                pending_count: grouped.pagination.total_items as u64,
            });
        }
        Ok(results)
    }
}
