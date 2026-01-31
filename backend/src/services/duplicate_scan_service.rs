//! Service for detecting and managing duplicate candidates across entity types

use crate::models::band_duplicate_candidates::{
    ActiveModel as BandCandidateActiveModel, CandidateStatus,
    Column as BandCandidateColumn, Entity as BandDuplicateCandidate,
    Model as BandCandidateModel,
};
use crate::models::album_duplicate_candidates::{
    ActiveModel as AlbumCandidateActiveModel,
    Column as AlbumCandidateColumn, Entity as AlbumDuplicateCandidate,
    Model as AlbumCandidateModel,
};
use crate::models::label_duplicate_candidates::{
    ActiveModel as LabelCandidateActiveModel,
    Column as LabelCandidateColumn, Entity as LabelDuplicateCandidate,
    Model as LabelCandidateModel,
};
use crate::models::radio_station_duplicate_candidates::{
    ActiveModel as RadioStationCandidateActiveModel,
    Column as RadioStationCandidateColumn, Entity as RadioStationDuplicateCandidate,
    Model as RadioStationCandidateModel,
};
use crate::models::staff_member_duplicate_candidates::{
    ActiveModel as StaffMemberCandidateActiveModel,
    Column as StaffMemberCandidateColumn, Entity as StaffMemberDuplicateCandidate,
    Model as StaffMemberCandidateModel,
};
use crate::models::albums::{Column as AlbumColumn, Entity as Album};
use crate::models::bands::{Column as BandColumn, Entity as Band};
use crate::models::labels::{Column as LabelColumn, Entity as Label};
use crate::models::radio_stations::{Column as RadioStationColumn, Entity as RadioStation};
use crate::models::staff_members::{Column as StaffMemberColumn, Entity as StaffMember};
use crate::models::duplicate_scan_state::{
    ActiveModel as ScanStateActiveModel, Column as ScanStateColumn,
    Entity as DuplicateScanState, ScanEntityType, StopReason,
};
use crate::services::album_service::AlbumService;
use crate::services::band_service::BandService;
use crate::services::label_service::LabelService;
use crate::services::radio_station_service::RadioStationService;
use crate::services::staff_service::StaffService;
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

impl From<BandCandidateModel> for GenericCandidate {
    fn from(c: BandCandidateModel) -> Self {
        Self {
            id: c.id, entity_id_1: c.band_id_1, entity_id_2: c.band_id_2,
            similarity_score: c.similarity_score, match_reasons: c.match_reasons,
            status: c.status, reviewed_by: c.reviewed_by, reviewed_at: c.reviewed_at,
            detected_at: c.detected_at,
        }
    }
}

impl From<AlbumCandidateModel> for GenericCandidate {
    fn from(c: AlbumCandidateModel) -> Self {
        Self {
            id: c.id, entity_id_1: c.album_id_1, entity_id_2: c.album_id_2,
            similarity_score: c.similarity_score, match_reasons: c.match_reasons,
            status: c.status, reviewed_by: c.reviewed_by, reviewed_at: c.reviewed_at,
            detected_at: c.detected_at,
        }
    }
}

impl From<LabelCandidateModel> for GenericCandidate {
    fn from(c: LabelCandidateModel) -> Self {
        Self {
            id: c.id, entity_id_1: c.label_id_1, entity_id_2: c.label_id_2,
            similarity_score: c.similarity_score, match_reasons: c.match_reasons,
            status: c.status, reviewed_by: c.reviewed_by, reviewed_at: c.reviewed_at,
            detected_at: c.detected_at,
        }
    }
}

impl From<RadioStationCandidateModel> for GenericCandidate {
    fn from(c: RadioStationCandidateModel) -> Self {
        Self {
            id: c.id, entity_id_1: c.radio_station_id_1, entity_id_2: c.radio_station_id_2,
            similarity_score: c.similarity_score, match_reasons: c.match_reasons,
            status: c.status, reviewed_by: c.reviewed_by, reviewed_at: c.reviewed_at,
            detected_at: c.detected_at,
        }
    }
}

impl From<StaffMemberCandidateModel> for GenericCandidate {
    fn from(c: StaffMemberCandidateModel) -> Self {
        Self {
            id: c.id, entity_id_1: c.staff_member_id_1, entity_id_2: c.staff_member_id_2,
            similarity_score: c.similarity_score, match_reasons: c.match_reasons,
            status: c.status, reviewed_by: c.reviewed_by, reviewed_at: c.reviewed_at,
            detected_at: c.detected_at,
        }
    }
}

impl DuplicateScanService {
    // ──────────────────────────── helpers ────────────────────────────

    /// Find scan state row by entity type
    async fn find_state(
        db: &DatabaseConnection,
        entity_type: &ScanEntityType,
    ) -> Result<crate::models::duplicate_scan_state::Model, DbErr> {
        DuplicateScanState::find()
            .filter(ScanStateColumn::EntityType.eq(entity_type.to_string()))
            .one(db)
            .await?
            .ok_or_else(|| {
                DbErr::RecordNotFound(format!(
                    "Scan state not found for entity type: {}",
                    entity_type
                ))
            })
    }

    /// Get total entity count for progress calculation
    async fn get_total_entity_count(
        db: &DatabaseConnection,
        entity_type: &ScanEntityType,
    ) -> Result<u64, DbErr> {
        match entity_type {
            ScanEntityType::Bands => Band::find().count(db).await,
            ScanEntityType::Albums => Album::find().count(db).await,
            ScanEntityType::Labels => Label::find().count(db).await,
            ScanEntityType::RadioStations => RadioStation::find().count(db).await,
            ScanEntityType::StaffMembers => StaffMember::find().count(db).await,
        }
    }

    // ──────────────────────────── scan state ────────────────────────────

    /// Get the current scan state for an entity type
    pub async fn get_scan_state(
        db: &DatabaseConnection,
        entity_type: &ScanEntityType,
    ) -> Result<ScanStateResponse, DbErr> {
        let state = Self::find_state(db, entity_type).await?;
        let total_items = Self::get_total_entity_count(db, entity_type).await?;
        let progress = if total_items > 0 {
            (state.total_items_scanned as f64 / total_items as f64) * 100.0
        } else {
            0.0
        };

        Ok(ScanStateResponse {
            id: state.id,
            entity_type: state.entity_type,
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
        })
    }

    /// Get scan states for all entity types (for SSE)
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
                let total_items = Self::get_total_entity_count(db, &entity_type).await?;
                let progress = if total_items > 0 {
                    (state.total_items_scanned as f64 / total_items as f64) * 100.0
                } else {
                    0.0
                };
                results.push(ScanStateResponse {
                    id: state.id,
                    entity_type: state.entity_type,
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
                });
            }
        }
        Ok(results)
    }

    // ──────────────────────────── start / stop ────────────────────────────

    /// Start a duplicate scan for a specific entity type
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
        if request.reset_progress.unwrap_or(false) {
            active_model.last_processed_id = Set(0);
            active_model.total_items_scanned = Set(0);
            active_model.duplicates_found = Set(0);
        }

        active_model.update(db).await?;

        Self::get_scan_state(db, entity_type).await
    }

    /// Stop a running scan for a specific entity type
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

    /// Run the duplicate scan as a background loop for a specific entity type
    pub async fn run_scan_background(
        db: DatabaseConnection,
        entity_type: ScanEntityType,
    ) -> Result<(), DbErr> {
        tracing::info!("Duplicate scan job started for {}", entity_type.display_name());

        loop {
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

            tokio::time::sleep(tokio::time::Duration::from_millis(delay_ms)).await;
        }
    }

    /// Process a single batch for a specific entity type
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

        if state.duplicates_found >= max_duplicates {
            Self::finalize_scan(db, entity_type, StopReason::LimitReached, None).await?;
            return Ok((0, 0, true));
        }

        match entity_type {
            ScanEntityType::Bands => {
                Self::process_batch_bands(db, &state, batch_size, min_similarity, max_duplicates, jw_weight, dice_weight).await
            }
            ScanEntityType::Albums => {
                Self::process_batch_albums(db, &state, batch_size, min_similarity, max_duplicates, jw_weight, dice_weight).await
            }
            ScanEntityType::Labels => {
                Self::process_batch_labels(db, &state, batch_size, min_similarity, max_duplicates, jw_weight, dice_weight).await
            }
            ScanEntityType::RadioStations => {
                Self::process_batch_radio_stations(db, &state, batch_size, min_similarity, max_duplicates, jw_weight, dice_weight).await
            }
            ScanEntityType::StaffMembers => {
                Self::process_batch_staff_members(db, &state, batch_size, min_similarity, max_duplicates, jw_weight, dice_weight).await
            }
        }
    }

    // ──────────────────────────── batch: bands ────────────────────────────

    async fn process_batch_bands(
        db: &DatabaseConnection,
        state: &crate::models::duplicate_scan_state::Model,
        batch_size: u64,
        min_similarity: i32,
        max_duplicates: u32,
        jw_weight: f64,
        dice_weight: f64,
    ) -> Result<(u32, u32, bool), DbErr> {
        let entity_type = ScanEntityType::Bands;
        let bands = Band::find()
            .filter(BandColumn::Id.gt(state.last_processed_id))
            .order_by_asc(BandColumn::Id)
            .limit(batch_size)
            .all(db)
            .await?;

        if bands.is_empty() {
            Self::finalize_scan(db, &entity_type, StopReason::Completed, None).await?;
            return Ok((0, 0, true));
        }

        let mut items_processed = 0u32;
        let mut duplicates_found = 0u32;
        let mut last_id = state.last_processed_id;

        let batch_ids: Vec<u32> = bands.iter().map(|b| b.id).collect();
        let existing_pairs = Self::get_existing_pairs_band(db, &batch_ids).await?;

        for band in bands {
            last_id = band.id;
            items_processed += 1;

            let params = SimilarityParams {
                search_term: band.name.clone(),
                existing_id: Some(band.id),
                jw_weight: Some(jw_weight),
                dice_weight: Some(dice_weight),
                min_similarity: Some(min_similarity),
                limit: Some(50),
                ..Default::default()
            };

            match BandService::get_similar_bands(db, params).await {
                Ok(similar) => {
                    for result in similar {
                        let other_id = result.model.band.id;
                        if other_id == band.id {
                            continue;
                        }

                        let (id1, id2) = if band.id < other_id {
                            (band.id, other_id)
                        } else {
                            (other_id, band.id)
                        };

                        if existing_pairs.contains(&(id1, id2)) {
                            continue;
                        }

                        let now = chrono::Utc::now().naive_utc();
                        let candidate = BandCandidateActiveModel {
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

                        match candidate.insert(db).await {
                            Ok(_) => duplicates_found += 1,
                            Err(DbErr::Query(RuntimeErr::SqlxError(ref arc_err))) => {
                                let is_duplicate = format!("{:?}", arc_err).contains("1062")
                                    || format!("{:?}", arc_err).contains("Duplicate entry");
                                if !is_duplicate {
                                    tracing::warn!("Failed to insert candidate: {:?}", arc_err);
                                }
                            }
                            Err(e) => {
                                tracing::warn!("Failed to insert candidate: {:?}", e);
                            }
                        }

                        if state.duplicates_found + duplicates_found >= max_duplicates {
                            break;
                        }
                    }
                }
                Err(e) => {
                    tracing::warn!("Error finding similar bands for {}: {:?}", band.id, e);
                }
            }

            if state.duplicates_found + duplicates_found >= max_duplicates {
                break;
            }
        }

        Self::update_progress(db, &entity_type, state, last_id, items_processed, duplicates_found).await?;
        Ok((items_processed, duplicates_found, false))
    }

    // ──────────────────────────── batch: albums ────────────────────────────

    async fn process_batch_albums(
        db: &DatabaseConnection,
        state: &crate::models::duplicate_scan_state::Model,
        batch_size: u64,
        min_similarity: i32,
        max_duplicates: u32,
        jw_weight: f64,
        dice_weight: f64,
    ) -> Result<(u32, u32, bool), DbErr> {
        let entity_type = ScanEntityType::Albums;
        let albums = Album::find()
            .filter(AlbumColumn::Id.gt(state.last_processed_id))
            .order_by_asc(AlbumColumn::Id)
            .limit(batch_size)
            .all(db)
            .await?;

        if albums.is_empty() {
            Self::finalize_scan(db, &entity_type, StopReason::Completed, None).await?;
            return Ok((0, 0, true));
        }

        let mut items_processed = 0u32;
        let mut duplicates_found = 0u32;
        let mut last_id = state.last_processed_id;

        let batch_ids: Vec<u32> = albums.iter().map(|a| a.id).collect();
        let existing_pairs = Self::get_existing_pairs_album(db, &batch_ids).await?;

        for album in albums {
            last_id = album.id;
            items_processed += 1;

            let name = match album.name.as_deref() {
                Some(n) if !n.is_empty() => n.to_string(),
                _ => continue,
            };

            let params = SimilarityParams {
                search_term: name,
                existing_id: Some(album.id),
                jw_weight: Some(jw_weight),
                dice_weight: Some(dice_weight),
                min_similarity: Some(min_similarity),
                limit: Some(50),
                ..Default::default()
            };

            match AlbumService::get_similar_albums(db, params).await {
                Ok(similar) => {
                    for result in similar {
                        let other_id = result.model.id;
                        if other_id == album.id { continue; }
                        let (id1, id2) = if album.id < other_id { (album.id, other_id) } else { (other_id, album.id) };
                        if existing_pairs.contains(&(id1, id2)) { continue; }

                        let now = chrono::Utc::now().naive_utc();
                        let candidate = AlbumCandidateActiveModel {
                            album_id_1: Set(id1), album_id_2: Set(id2),
                            similarity_score: Set(result.similarity_score),
                            match_reasons: Set(Some(serde_json::json!({"score": result.similarity_score, "method": "similarity_pipeline"}))),
                            status: Set(CandidateStatus::Pending.to_string()),
                            detected_at: Set(now),
                            scan_settings: Set(Some(serde_json::json!({"min_similarity": min_similarity, "jw_weight": jw_weight, "dice_weight": dice_weight}))),
                            ..Default::default()
                        };
                        match candidate.insert(db).await {
                            Ok(_) => duplicates_found += 1,
                            Err(DbErr::Query(RuntimeErr::SqlxError(ref e))) => {
                                if !format!("{:?}", e).contains("1062") && !format!("{:?}", e).contains("Duplicate entry") {
                                    tracing::warn!("Failed to insert album candidate: {:?}", e);
                                }
                            }
                            Err(e) => tracing::warn!("Failed to insert album candidate: {:?}", e),
                        }
                        if state.duplicates_found + duplicates_found >= max_duplicates { break; }
                    }
                }
                Err(e) => tracing::warn!("Error finding similar albums for {}: {:?}", album.id, e),
            }
            if state.duplicates_found + duplicates_found >= max_duplicates { break; }
        }

        Self::update_progress(db, &entity_type, state, last_id, items_processed, duplicates_found).await?;
        Ok((items_processed, duplicates_found, false))
    }

    // ──────────────────────────── batch: labels ────────────────────────────

    async fn process_batch_labels(
        db: &DatabaseConnection,
        state: &crate::models::duplicate_scan_state::Model,
        batch_size: u64,
        min_similarity: i32,
        max_duplicates: u32,
        jw_weight: f64,
        dice_weight: f64,
    ) -> Result<(u32, u32, bool), DbErr> {
        let entity_type = ScanEntityType::Labels;
        let labels = Label::find()
            .filter(LabelColumn::Id.gt(state.last_processed_id))
            .order_by_asc(LabelColumn::Id)
            .limit(batch_size)
            .all(db)
            .await?;

        if labels.is_empty() {
            Self::finalize_scan(db, &entity_type, StopReason::Completed, None).await?;
            return Ok((0, 0, true));
        }

        let mut items_processed = 0u32;
        let mut duplicates_found = 0u32;
        let mut last_id = state.last_processed_id;

        let batch_ids: Vec<u32> = labels.iter().map(|l| l.id).collect();
        let existing_pairs = Self::get_existing_pairs_label(db, &batch_ids).await?;

        for label in labels {
            last_id = label.id;
            items_processed += 1;

            let name = match label.name.as_deref() {
                Some(n) if !n.is_empty() => n.to_string(),
                _ => continue,
            };

            let params = SimilarityParams {
                search_term: name,
                existing_id: Some(label.id),
                jw_weight: Some(jw_weight),
                dice_weight: Some(dice_weight),
                min_similarity: Some(min_similarity),
                limit: Some(50),
                ..Default::default()
            };

            match LabelService::get_similar_labels(db, params).await {
                Ok(similar) => {
                    for result in similar {
                        let other_id = result.model.id;
                        if other_id == label.id { continue; }
                        let (id1, id2) = if label.id < other_id { (label.id, other_id) } else { (other_id, label.id) };
                        if existing_pairs.contains(&(id1, id2)) { continue; }

                        let now = chrono::Utc::now().naive_utc();
                        let candidate = LabelCandidateActiveModel {
                            label_id_1: Set(id1), label_id_2: Set(id2),
                            similarity_score: Set(result.similarity_score),
                            match_reasons: Set(Some(serde_json::json!({"score": result.similarity_score, "method": "similarity_pipeline"}))),
                            status: Set(CandidateStatus::Pending.to_string()),
                            detected_at: Set(now),
                            scan_settings: Set(Some(serde_json::json!({"min_similarity": min_similarity, "jw_weight": jw_weight, "dice_weight": dice_weight}))),
                            ..Default::default()
                        };
                        match candidate.insert(db).await {
                            Ok(_) => duplicates_found += 1,
                            Err(DbErr::Query(RuntimeErr::SqlxError(ref e))) => {
                                if !format!("{:?}", e).contains("1062") && !format!("{:?}", e).contains("Duplicate entry") {
                                    tracing::warn!("Failed to insert label candidate: {:?}", e);
                                }
                            }
                            Err(e) => tracing::warn!("Failed to insert label candidate: {:?}", e),
                        }
                        if state.duplicates_found + duplicates_found >= max_duplicates { break; }
                    }
                }
                Err(e) => tracing::warn!("Error finding similar labels for {}: {:?}", label.id, e),
            }
            if state.duplicates_found + duplicates_found >= max_duplicates { break; }
        }

        Self::update_progress(db, &entity_type, state, last_id, items_processed, duplicates_found).await?;
        Ok((items_processed, duplicates_found, false))
    }

    // ──────────────────────────── batch: radio stations ────────────────────────────

    async fn process_batch_radio_stations(
        db: &DatabaseConnection,
        state: &crate::models::duplicate_scan_state::Model,
        batch_size: u64,
        min_similarity: i32,
        max_duplicates: u32,
        jw_weight: f64,
        dice_weight: f64,
    ) -> Result<(u32, u32, bool), DbErr> {
        let entity_type = ScanEntityType::RadioStations;
        let stations = RadioStation::find()
            .filter(RadioStationColumn::Id.gt(state.last_processed_id))
            .order_by_asc(RadioStationColumn::Id)
            .limit(batch_size)
            .all(db)
            .await?;

        if stations.is_empty() {
            Self::finalize_scan(db, &entity_type, StopReason::Completed, None).await?;
            return Ok((0, 0, true));
        }

        let mut items_processed = 0u32;
        let mut duplicates_found = 0u32;
        let mut last_id = state.last_processed_id;

        let batch_ids: Vec<u32> = stations.iter().map(|s| s.id).collect();
        let existing_pairs = Self::get_existing_pairs_radio_station(db, &batch_ids).await?;

        for station in stations {
            last_id = station.id;
            items_processed += 1;

            let name = match station.name.as_deref() {
                Some(n) if !n.is_empty() => n.to_string(),
                _ => continue,
            };

            let params = SimilarityParams {
                search_term: name,
                existing_id: Some(station.id),
                jw_weight: Some(jw_weight),
                dice_weight: Some(dice_weight),
                min_similarity: Some(min_similarity),
                limit: Some(50),
                ..Default::default()
            };

            match RadioStationService::get_similar_radio_stations(db, params).await {
                Ok(similar) => {
                    for result in similar {
                        let other_id = result.model.id;
                        if other_id == station.id { continue; }
                        let (id1, id2) = if station.id < other_id { (station.id, other_id) } else { (other_id, station.id) };
                        if existing_pairs.contains(&(id1, id2)) { continue; }

                        let now = chrono::Utc::now().naive_utc();
                        let candidate = RadioStationCandidateActiveModel {
                            radio_station_id_1: Set(id1), radio_station_id_2: Set(id2),
                            similarity_score: Set(result.similarity_score),
                            match_reasons: Set(Some(serde_json::json!({"score": result.similarity_score, "method": "similarity_pipeline"}))),
                            status: Set(CandidateStatus::Pending.to_string()),
                            detected_at: Set(now),
                            scan_settings: Set(Some(serde_json::json!({"min_similarity": min_similarity, "jw_weight": jw_weight, "dice_weight": dice_weight}))),
                            ..Default::default()
                        };
                        match candidate.insert(db).await {
                            Ok(_) => duplicates_found += 1,
                            Err(DbErr::Query(RuntimeErr::SqlxError(ref e))) => {
                                if !format!("{:?}", e).contains("1062") && !format!("{:?}", e).contains("Duplicate entry") {
                                    tracing::warn!("Failed to insert radio station candidate: {:?}", e);
                                }
                            }
                            Err(e) => tracing::warn!("Failed to insert radio station candidate: {:?}", e),
                        }
                        if state.duplicates_found + duplicates_found >= max_duplicates { break; }
                    }
                }
                Err(e) => tracing::warn!("Error finding similar radio stations for {}: {:?}", station.id, e),
            }
            if state.duplicates_found + duplicates_found >= max_duplicates { break; }
        }

        Self::update_progress(db, &entity_type, state, last_id, items_processed, duplicates_found).await?;
        Ok((items_processed, duplicates_found, false))
    }

    // ──────────────────────────── batch: staff members ────────────────────────────

    async fn process_batch_staff_members(
        db: &DatabaseConnection,
        state: &crate::models::duplicate_scan_state::Model,
        batch_size: u64,
        min_similarity: i32,
        max_duplicates: u32,
        jw_weight: f64,
        dice_weight: f64,
    ) -> Result<(u32, u32, bool), DbErr> {
        let entity_type = ScanEntityType::StaffMembers;
        let staff = StaffMember::find()
            .filter(StaffMemberColumn::Id.gt(state.last_processed_id))
            .order_by_asc(StaffMemberColumn::Id)
            .limit(batch_size)
            .all(db)
            .await?;

        if staff.is_empty() {
            Self::finalize_scan(db, &entity_type, StopReason::Completed, None).await?;
            return Ok((0, 0, true));
        }

        let mut items_processed = 0u32;
        let mut duplicates_found = 0u32;
        let mut last_id = state.last_processed_id;

        let batch_ids: Vec<u32> = staff.iter().map(|s| s.id).collect();
        let existing_pairs = Self::get_existing_pairs_staff_member(db, &batch_ids).await?;

        for member in staff {
            last_id = member.id;
            items_processed += 1;

            // Build search name from first_name + last_name
            let search_name = format!(
                "{} {}",
                member.first_name.as_deref().unwrap_or(""),
                member.last_name.as_deref().unwrap_or("")
            )
            .trim()
            .to_string();

            if search_name.is_empty() {
                continue;
            }

            let params = SimilarityParams {
                search_term: search_name.clone(),
                existing_id: Some(member.id),
                jw_weight: Some(jw_weight),
                dice_weight: Some(dice_weight),
                min_similarity: Some(min_similarity),
                limit: Some(50),
                ..Default::default()
            };

            match StaffService::get_similar_staff_members(db, params).await {
                Ok(similar) => {
                    for result in similar {
                        let other_id = result.model.id;
                        if other_id == member.id {
                            continue;
                        }

                        let (id1, id2) = if member.id < other_id {
                            (member.id, other_id)
                        } else {
                            (other_id, member.id)
                        };

                        if existing_pairs.contains(&(id1, id2)) {
                            continue;
                        }

                        let now = chrono::Utc::now().naive_utc();
                        let candidate = StaffMemberCandidateActiveModel {
                            staff_member_id_1: Set(id1),
                            staff_member_id_2: Set(id2),
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

                        match candidate.insert(db).await {
                            Ok(_) => duplicates_found += 1,
                            Err(DbErr::Query(RuntimeErr::SqlxError(ref arc_err))) => {
                                let is_duplicate = format!("{:?}", arc_err).contains("1062")
                                    || format!("{:?}", arc_err).contains("Duplicate entry");
                                if !is_duplicate {
                                    tracing::warn!("Failed to insert candidate: {:?}", arc_err);
                                }
                            }
                            Err(e) => {
                                tracing::warn!("Failed to insert candidate: {:?}", e);
                            }
                        }

                        if state.duplicates_found + duplicates_found >= max_duplicates {
                            break;
                        }
                    }
                }
                Err(e) => {
                    tracing::warn!("Error finding similar staff for {}: {:?}", member.id, e);
                }
            }

            if state.duplicates_found + duplicates_found >= max_duplicates {
                break;
            }
        }

        Self::update_progress(db, &entity_type, state, last_id, items_processed, duplicates_found).await?;
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

    // ──────────────────────────── existing pairs helpers ────────────────────────────

    async fn get_existing_pairs_band(
        db: &DatabaseConnection,
        ids: &[u32],
    ) -> Result<HashSet<(u32, u32)>, DbErr> {
        let candidates = BandDuplicateCandidate::find()
            .filter(
                Condition::any()
                    .add(BandCandidateColumn::BandId1.is_in(ids.to_vec()))
                    .add(BandCandidateColumn::BandId2.is_in(ids.to_vec())),
            )
            .all(db)
            .await?;
        Ok(candidates.into_iter().map(|c| (c.band_id_1, c.band_id_2)).collect())
    }

    async fn get_existing_pairs_album(
        db: &DatabaseConnection,
        ids: &[u32],
    ) -> Result<HashSet<(u32, u32)>, DbErr> {
        let candidates = AlbumDuplicateCandidate::find()
            .filter(
                Condition::any()
                    .add(AlbumCandidateColumn::AlbumId1.is_in(ids.to_vec()))
                    .add(AlbumCandidateColumn::AlbumId2.is_in(ids.to_vec())),
            )
            .all(db)
            .await?;
        Ok(candidates.into_iter().map(|c| (c.album_id_1, c.album_id_2)).collect())
    }

    async fn get_existing_pairs_label(
        db: &DatabaseConnection,
        ids: &[u32],
    ) -> Result<HashSet<(u32, u32)>, DbErr> {
        let candidates = LabelDuplicateCandidate::find()
            .filter(
                Condition::any()
                    .add(LabelCandidateColumn::LabelId1.is_in(ids.to_vec()))
                    .add(LabelCandidateColumn::LabelId2.is_in(ids.to_vec())),
            )
            .all(db)
            .await?;
        Ok(candidates.into_iter().map(|c| (c.label_id_1, c.label_id_2)).collect())
    }

    async fn get_existing_pairs_radio_station(
        db: &DatabaseConnection,
        ids: &[u32],
    ) -> Result<HashSet<(u32, u32)>, DbErr> {
        let candidates = RadioStationDuplicateCandidate::find()
            .filter(
                Condition::any()
                    .add(RadioStationCandidateColumn::RadioStationId1.is_in(ids.to_vec()))
                    .add(RadioStationCandidateColumn::RadioStationId2.is_in(ids.to_vec())),
            )
            .all(db)
            .await?;
        Ok(candidates.into_iter().map(|c| (c.radio_station_id_1, c.radio_station_id_2)).collect())
    }

    async fn get_existing_pairs_staff_member(
        db: &DatabaseConnection,
        ids: &[u32],
    ) -> Result<HashSet<(u32, u32)>, DbErr> {
        let candidates = StaffMemberDuplicateCandidate::find()
            .filter(
                Condition::any()
                    .add(StaffMemberCandidateColumn::StaffMemberId1.is_in(ids.to_vec()))
                    .add(StaffMemberCandidateColumn::StaffMemberId2.is_in(ids.to_vec())),
            )
            .all(db)
            .await?;
        Ok(candidates.into_iter().map(|c| (c.staff_member_id_1, c.staff_member_id_2)).collect())
    }

    // ──────────────────────────── candidates CRUD ────────────────────────────

    /// Get candidates grouped by entity for a specific entity type
    pub async fn get_candidates_grouped(
        db: &DatabaseConnection,
        entity_type: &ScanEntityType,
        params: CandidateFilterParams,
    ) -> Result<PaginatedResponse<GroupedDuplicateResponse>, DbErr> {
        let page = params.page.unwrap_or(1);
        let page_size = params.page_size.unwrap_or(20);

        // Fetch all candidates as generic
        let all_candidates = Self::fetch_all_candidates(db, entity_type, &params).await?;

        // Group by entity_id_1
        let mut grouped: std::collections::HashMap<u32, Vec<GenericCandidate>> =
            std::collections::HashMap::new();
        for candidate in all_candidates {
            grouped.entry(candidate.entity_id_1).or_default().push(candidate);
        }

        let total = grouped.len() as u64;
        let total_pages = (total as f64 / page_size as f64).ceil() as u64;

        // Sort by highest score
        let mut sorted_groups: Vec<(u32, Vec<GenericCandidate>)> = grouped.into_iter().collect();
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

        // Collect all entity IDs we need
        let mut all_entity_ids: Vec<u32> = page_groups.iter().map(|(id, _)| *id).collect();
        for (_, candidates) in page_groups {
            for c in candidates {
                all_entity_ids.push(c.entity_id_2);
            }
        }
        all_entity_ids.sort();
        all_entity_ids.dedup();

        // Load entity summaries
        let entity_map = Self::load_entity_summaries(db, entity_type, &all_entity_ids).await?;

        // Build response
        let mut results = Vec::new();
        for (entity_id, candidates) in page_groups {
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

    /// Update candidate status
    pub async fn update_candidate_status(
        db: &DatabaseConnection,
        entity_type: &ScanEntityType,
        candidate_id: u32,
        status: CandidateStatus,
        user_id: Option<u32>,
    ) -> Result<(), DbErr> {
        let now = chrono::Utc::now().naive_utc();
        match entity_type {
            ScanEntityType::Bands => {
                BandCandidateActiveModel {
                    id: Set(candidate_id),
                    status: Set(status.to_string()),
                    reviewed_by: Set(user_id),
                    reviewed_at: Set(Some(now)),
                    ..Default::default()
                }.update(db).await?;
            }
            ScanEntityType::Albums => {
                AlbumCandidateActiveModel {
                    id: Set(candidate_id),
                    status: Set(status.to_string()),
                    reviewed_by: Set(user_id),
                    reviewed_at: Set(Some(now)),
                    ..Default::default()
                }.update(db).await?;
            }
            ScanEntityType::Labels => {
                LabelCandidateActiveModel {
                    id: Set(candidate_id),
                    status: Set(status.to_string()),
                    reviewed_by: Set(user_id),
                    reviewed_at: Set(Some(now)),
                    ..Default::default()
                }.update(db).await?;
            }
            ScanEntityType::RadioStations => {
                RadioStationCandidateActiveModel {
                    id: Set(candidate_id),
                    status: Set(status.to_string()),
                    reviewed_by: Set(user_id),
                    reviewed_at: Set(Some(now)),
                    ..Default::default()
                }.update(db).await?;
            }
            ScanEntityType::StaffMembers => {
                StaffMemberCandidateActiveModel {
                    id: Set(candidate_id),
                    status: Set(status.to_string()),
                    reviewed_by: Set(user_id),
                    reviewed_at: Set(Some(now)),
                    ..Default::default()
                }.update(db).await?;
            }
        }
        Ok(())
    }

    /// Restore a dismissed candidate to pending
    pub async fn restore_candidate(
        db: &DatabaseConnection,
        entity_type: &ScanEntityType,
        candidate_id: u32,
    ) -> Result<(), DbErr> {
        match entity_type {
            ScanEntityType::Bands => {
                BandCandidateActiveModel {
                    id: Set(candidate_id),
                    status: Set(CandidateStatus::Pending.to_string()),
                    reviewed_by: Set(None),
                    reviewed_at: Set(None),
                    ..Default::default()
                }.update(db).await?;
            }
            ScanEntityType::Albums => {
                AlbumCandidateActiveModel {
                    id: Set(candidate_id),
                    status: Set(CandidateStatus::Pending.to_string()),
                    reviewed_by: Set(None),
                    reviewed_at: Set(None),
                    ..Default::default()
                }.update(db).await?;
            }
            ScanEntityType::Labels => {
                LabelCandidateActiveModel {
                    id: Set(candidate_id),
                    status: Set(CandidateStatus::Pending.to_string()),
                    reviewed_by: Set(None),
                    reviewed_at: Set(None),
                    ..Default::default()
                }.update(db).await?;
            }
            ScanEntityType::RadioStations => {
                RadioStationCandidateActiveModel {
                    id: Set(candidate_id),
                    status: Set(CandidateStatus::Pending.to_string()),
                    reviewed_by: Set(None),
                    reviewed_at: Set(None),
                    ..Default::default()
                }.update(db).await?;
            }
            ScanEntityType::StaffMembers => {
                StaffMemberCandidateActiveModel {
                    id: Set(candidate_id),
                    status: Set(CandidateStatus::Pending.to_string()),
                    reviewed_by: Set(None),
                    reviewed_at: Set(None),
                    ..Default::default()
                }.update(db).await?;
            }
        }
        Ok(())
    }

    /// Clear all candidates for an entity type
    pub async fn clear_candidates(
        db: &DatabaseConnection,
        entity_type: &ScanEntityType,
        pending_only: bool,
    ) -> Result<u64, DbErr> {
        let rows = match entity_type {
            ScanEntityType::Bands => {
                let mut del = BandDuplicateCandidate::delete_many();
                if pending_only { del = del.filter(BandCandidateColumn::Status.eq("pending")); }
                del.exec(db).await?.rows_affected
            }
            ScanEntityType::Albums => {
                let mut del = AlbumDuplicateCandidate::delete_many();
                if pending_only { del = del.filter(AlbumCandidateColumn::Status.eq("pending")); }
                del.exec(db).await?.rows_affected
            }
            ScanEntityType::Labels => {
                let mut del = LabelDuplicateCandidate::delete_many();
                if pending_only { del = del.filter(LabelCandidateColumn::Status.eq("pending")); }
                del.exec(db).await?.rows_affected
            }
            ScanEntityType::RadioStations => {
                let mut del = RadioStationDuplicateCandidate::delete_many();
                if pending_only { del = del.filter(RadioStationCandidateColumn::Status.eq("pending")); }
                del.exec(db).await?.rows_affected
            }
            ScanEntityType::StaffMembers => {
                let mut del = StaffMemberDuplicateCandidate::delete_many();
                if pending_only { del = del.filter(StaffMemberCandidateColumn::Status.eq("pending")); }
                del.exec(db).await?.rows_affected
            }
        };
        Ok(rows)
    }

    /// Get all matches for a specific entity (for the Review modal)
    pub async fn get_entity_matches(
        db: &DatabaseConnection,
        entity_type: &ScanEntityType,
        entity_id: u32,
    ) -> Result<Vec<GenericCandidate>, DbErr> {
        match entity_type {
            ScanEntityType::Bands => {
                let candidates = BandDuplicateCandidate::find()
                    .filter(
                        Condition::any()
                            .add(BandCandidateColumn::BandId1.eq(entity_id))
                            .add(BandCandidateColumn::BandId2.eq(entity_id)),
                    )
                    .order_by_desc(BandCandidateColumn::SimilarityScore)
                    .all(db).await?;
                Ok(candidates.into_iter().map(GenericCandidate::from).collect())
            }
            ScanEntityType::Albums => {
                let candidates = AlbumDuplicateCandidate::find()
                    .filter(
                        Condition::any()
                            .add(AlbumCandidateColumn::AlbumId1.eq(entity_id))
                            .add(AlbumCandidateColumn::AlbumId2.eq(entity_id)),
                    )
                    .order_by_desc(AlbumCandidateColumn::SimilarityScore)
                    .all(db).await?;
                Ok(candidates.into_iter().map(GenericCandidate::from).collect())
            }
            ScanEntityType::Labels => {
                let candidates = LabelDuplicateCandidate::find()
                    .filter(
                        Condition::any()
                            .add(LabelCandidateColumn::LabelId1.eq(entity_id))
                            .add(LabelCandidateColumn::LabelId2.eq(entity_id)),
                    )
                    .order_by_desc(LabelCandidateColumn::SimilarityScore)
                    .all(db).await?;
                Ok(candidates.into_iter().map(GenericCandidate::from).collect())
            }
            ScanEntityType::RadioStations => {
                let candidates = RadioStationDuplicateCandidate::find()
                    .filter(
                        Condition::any()
                            .add(RadioStationCandidateColumn::RadioStationId1.eq(entity_id))
                            .add(RadioStationCandidateColumn::RadioStationId2.eq(entity_id)),
                    )
                    .order_by_desc(RadioStationCandidateColumn::SimilarityScore)
                    .all(db).await?;
                Ok(candidates.into_iter().map(GenericCandidate::from).collect())
            }
            ScanEntityType::StaffMembers => {
                let candidates = StaffMemberDuplicateCandidate::find()
                    .filter(
                        Condition::any()
                            .add(StaffMemberCandidateColumn::StaffMemberId1.eq(entity_id))
                            .add(StaffMemberCandidateColumn::StaffMemberId2.eq(entity_id)),
                    )
                    .order_by_desc(StaffMemberCandidateColumn::SimilarityScore)
                    .all(db).await?;
                Ok(candidates.into_iter().map(GenericCandidate::from).collect())
            }
        }
    }

    // ──────────────────────────── internal helpers ────────────────────────────

    /// Fetch all candidates for an entity type, applying filters
    async fn fetch_all_candidates(
        db: &DatabaseConnection,
        entity_type: &ScanEntityType,
        params: &CandidateFilterParams,
    ) -> Result<Vec<GenericCandidate>, DbErr> {
        match entity_type {
            ScanEntityType::Bands => {
                let mut query = BandDuplicateCandidate::find();
                if let Some(ref status) = params.status { query = query.filter(BandCandidateColumn::Status.eq(status)); }
                if let Some(min) = params.min_score { query = query.filter(BandCandidateColumn::SimilarityScore.gte(min)); }
                if let Some(max) = params.max_score { query = query.filter(BandCandidateColumn::SimilarityScore.lte(max)); }
                if let Some(eid) = params.entity_id {
                    query = query.filter(Condition::any().add(BandCandidateColumn::BandId1.eq(eid)).add(BandCandidateColumn::BandId2.eq(eid)));
                }
                query = query.order_by_desc(BandCandidateColumn::SimilarityScore);
                Ok(query.all(db).await?.into_iter().map(GenericCandidate::from).collect())
            }
            ScanEntityType::Albums => {
                let mut query = AlbumDuplicateCandidate::find();
                if let Some(ref status) = params.status { query = query.filter(AlbumCandidateColumn::Status.eq(status)); }
                if let Some(min) = params.min_score { query = query.filter(AlbumCandidateColumn::SimilarityScore.gte(min)); }
                if let Some(max) = params.max_score { query = query.filter(AlbumCandidateColumn::SimilarityScore.lte(max)); }
                if let Some(eid) = params.entity_id {
                    query = query.filter(Condition::any().add(AlbumCandidateColumn::AlbumId1.eq(eid)).add(AlbumCandidateColumn::AlbumId2.eq(eid)));
                }
                query = query.order_by_desc(AlbumCandidateColumn::SimilarityScore);
                Ok(query.all(db).await?.into_iter().map(GenericCandidate::from).collect())
            }
            ScanEntityType::Labels => {
                let mut query = LabelDuplicateCandidate::find();
                if let Some(ref status) = params.status { query = query.filter(LabelCandidateColumn::Status.eq(status)); }
                if let Some(min) = params.min_score { query = query.filter(LabelCandidateColumn::SimilarityScore.gte(min)); }
                if let Some(max) = params.max_score { query = query.filter(LabelCandidateColumn::SimilarityScore.lte(max)); }
                if let Some(eid) = params.entity_id {
                    query = query.filter(Condition::any().add(LabelCandidateColumn::LabelId1.eq(eid)).add(LabelCandidateColumn::LabelId2.eq(eid)));
                }
                query = query.order_by_desc(LabelCandidateColumn::SimilarityScore);
                Ok(query.all(db).await?.into_iter().map(GenericCandidate::from).collect())
            }
            ScanEntityType::RadioStations => {
                let mut query = RadioStationDuplicateCandidate::find();
                if let Some(ref status) = params.status { query = query.filter(RadioStationCandidateColumn::Status.eq(status)); }
                if let Some(min) = params.min_score { query = query.filter(RadioStationCandidateColumn::SimilarityScore.gte(min)); }
                if let Some(max) = params.max_score { query = query.filter(RadioStationCandidateColumn::SimilarityScore.lte(max)); }
                if let Some(eid) = params.entity_id {
                    query = query.filter(Condition::any().add(RadioStationCandidateColumn::RadioStationId1.eq(eid)).add(RadioStationCandidateColumn::RadioStationId2.eq(eid)));
                }
                query = query.order_by_desc(RadioStationCandidateColumn::SimilarityScore);
                Ok(query.all(db).await?.into_iter().map(GenericCandidate::from).collect())
            }
            ScanEntityType::StaffMembers => {
                let mut query = StaffMemberDuplicateCandidate::find();
                if let Some(ref status) = params.status { query = query.filter(StaffMemberCandidateColumn::Status.eq(status)); }
                if let Some(min) = params.min_score { query = query.filter(StaffMemberCandidateColumn::SimilarityScore.gte(min)); }
                if let Some(max) = params.max_score { query = query.filter(StaffMemberCandidateColumn::SimilarityScore.lte(max)); }
                if let Some(eid) = params.entity_id {
                    query = query.filter(Condition::any().add(StaffMemberCandidateColumn::StaffMemberId1.eq(eid)).add(StaffMemberCandidateColumn::StaffMemberId2.eq(eid)));
                }
                query = query.order_by_desc(StaffMemberCandidateColumn::SimilarityScore);
                Ok(query.all(db).await?.into_iter().map(GenericCandidate::from).collect())
            }
        }
    }

    /// Load lightweight entity summaries for display
    async fn load_entity_summaries(
        db: &DatabaseConnection,
        entity_type: &ScanEntityType,
        ids: &[u32],
    ) -> Result<std::collections::HashMap<u32, EntitySummary>, DbErr> {
        let mut map = std::collections::HashMap::new();
        match entity_type {
            ScanEntityType::Bands => {
                let entities = Band::find().filter(BandColumn::Id.is_in(ids.to_vec())).all(db).await?;
                for e in entities {
                    map.insert(e.id, EntitySummary {
                        id: e.id,
                        name: e.name.clone(),
                        slug: e.slug.clone().unwrap_or_default(),
                        verified: e.verified,
                        approved: e.approved,
                    });
                }
            }
            ScanEntityType::Albums => {
                let entities = Album::find().filter(AlbumColumn::Id.is_in(ids.to_vec())).all(db).await?;
                for e in entities {
                    map.insert(e.id, EntitySummary {
                        id: e.id,
                        name: e.name.clone().unwrap_or_default(),
                        slug: e.slug.clone().unwrap_or_default(),
                        verified: e.verified,
                        approved: e.approved,
                    });
                }
            }
            ScanEntityType::Labels => {
                let entities = Label::find().filter(LabelColumn::Id.is_in(ids.to_vec())).all(db).await?;
                for e in entities {
                    map.insert(e.id, EntitySummary {
                        id: e.id,
                        name: e.name.clone().unwrap_or_default(),
                        slug: e.slug.clone().unwrap_or_default(),
                        verified: 0,
                        approved: 0,
                    });
                }
            }
            ScanEntityType::RadioStations => {
                let entities = RadioStation::find().filter(RadioStationColumn::Id.is_in(ids.to_vec())).all(db).await?;
                for e in entities {
                    map.insert(e.id, EntitySummary {
                        id: e.id,
                        name: e.name.clone().unwrap_or_default(),
                        slug: e.slug.clone().unwrap_or_default(),
                        verified: e.verified,
                        approved: e.approved,
                    });
                }
            }
            ScanEntityType::StaffMembers => {
                let entities = StaffMember::find().filter(StaffMemberColumn::Id.is_in(ids.to_vec())).all(db).await?;
                for e in entities {
                    let name = format!(
                        "{} {}",
                        e.first_name.as_deref().unwrap_or(""),
                        e.last_name.as_deref().unwrap_or("")
                    ).trim().to_string();
                    map.insert(e.id, EntitySummary {
                        id: e.id,
                        name,
                        slug: e.slug.clone().unwrap_or_default(),
                        verified: e.verified,
                        approved: e.approved,
                    });
                }
            }
        }
        Ok(map)
    }
}
