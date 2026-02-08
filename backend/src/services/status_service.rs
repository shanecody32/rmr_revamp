//! Status service for managing entity data and chart statuses.
//!
//! Handles status updates with validation, audit logging, and automatic triggers.

use crate::models::{
    action_logs::{action_types, entity_types},
    albums, bands, radio_stations, songs, staff_members,
};
use crate::services::action_log_service::ActionLogService;
use chrono::Utc;
use sea_orm::*;
use sea_orm::sea_query::Expr;
use serde::{Deserialize, Serialize};

/// Data status values
pub mod data_status {
    pub const NEW: &str = "new";
    pub const VALIDATED: &str = "validated";
    pub const NEEDS_REVIEW: &str = "needs_review";
    pub const DUPLICATE_DETECTED: &str = "duplicate_detected";
}

/// Reasons for data status changes
pub mod data_status_reason {
    pub const MANUAL: &str = "manual";
    pub const ALBUM_ADDED: &str = "album_added";
    pub const SONG_ADDED: &str = "song_added";
    pub const MERGE: &str = "merge";
    pub const TRANSFER: &str = "transfer";
    pub const DUPLICATE_SCAN: &str = "duplicate_scan";
}

/// Chart status values
pub mod chart_status {
    pub const PENDING: &str = "pending";
    pub const APPROVED: &str = "approved";
    pub const DENIED: &str = "denied";
    pub const SUSPENDED: &str = "suspended";
}

/// Reasons for chart denial
pub mod chart_denial_reason {
    pub const DUPLICATE: &str = "duplicate";
    pub const TERMS_VIOLATION: &str = "terms_violation";
    pub const EDITORIAL: &str = "editorial";
    pub const SPAM: &str = "spam";
    pub const OTHER: &str = "other";
}

/// Request to update data status
#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
pub struct DataStatusUpdate {
    pub status: String,
    pub reason: Option<String>,
    pub note: Option<String>,
}

/// Request to update chart status
#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
pub struct ChartStatusUpdate {
    pub status: String,
    pub denial_reason: Option<String>,
    pub note: Option<String>,
}

/// Response from a status update operation
#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
pub struct StatusUpdateResult {
    pub success: bool,
    pub message: String,
    pub warning: Option<String>,
}

/// Entity status history entry
#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
pub struct StatusHistoryEntry {
    pub timestamp: String,
    pub action_type: String,
    pub old_status: Option<String>,
    pub new_status: String,
    pub reason: Option<String>,
    pub note: Option<String>,
    pub user_id: Option<u32>,
}

pub struct StatusService;

impl StatusService {
    // ========== BANDS ==========

    /// Update a band's data status
    pub async fn update_band_data_status(
        db: &DatabaseConnection,
        band_id: u32,
        update: DataStatusUpdate,
        user_id: Option<u32>,
        ip_address: Option<String>,
    ) -> Result<StatusUpdateResult, DbErr> {
        let band = bands::Entity::find_by_id(band_id)
            .one(db)
            .await?
            .ok_or_else(|| DbErr::RecordNotFound(format!("Band {} not found", band_id)))?;

        let old_status = band.data_status.clone();

        bands::Entity::update_many()
            .filter(bands::Column::Id.eq(band_id))
            .col_expr(bands::Column::DataStatus, Expr::value(&update.status))
            .col_expr(bands::Column::DataStatusReason, Expr::value(update.reason.as_deref()))
            .col_expr(bands::Column::DataStatusNote, Expr::value(update.note.as_deref()))
            .col_expr(bands::Column::DataStatusAt, Expr::value(Utc::now().naive_utc()))
            .col_expr(bands::Column::DataStatusBy, Expr::value(user_id))
            .exec(db)
            .await?;

        ActionLogService::record(
            db,
            action_types::DATA_STATUS_CHANGE,
            entity_types::BAND,
            band_id,
            user_id,
            Some(serde_json::json!({ "data_status": old_status })),
            Some(serde_json::json!({
                "data_status": update.status,
                "reason": update.reason,
                "note": update.note,
            })),
            None,
            ip_address,
        )
        .await?;

        Ok(StatusUpdateResult {
            success: true,
            message: format!("Band data status updated to '{}'", update.status),
            warning: None,
        })
    }

    /// Update a band's chart status
    pub async fn update_band_chart_status(
        db: &DatabaseConnection,
        band_id: u32,
        update: ChartStatusUpdate,
        user_id: Option<u32>,
        ip_address: Option<String>,
    ) -> Result<StatusUpdateResult, DbErr> {
        let band = bands::Entity::find_by_id(band_id)
            .one(db)
            .await?
            .ok_or_else(|| DbErr::RecordNotFound(format!("Band {} not found", band_id)))?;

        // Validation: can't approve if duplicate detected
        if update.status == chart_status::APPROVED && band.data_status == data_status::DUPLICATE_DETECTED {
            return Err(DbErr::Custom(
                "Cannot approve for charting while duplicate status is detected. Resolve duplicates first.".to_string()
            ));
        }

        let old_status = band.chart_status.clone();
        let mut warning = None;

        // Warn if approving without validation
        if update.status == chart_status::APPROVED && band.data_status != data_status::VALIDATED {
            warning = Some("Entity approved for charting but data has not been validated.".to_string());
        }

        bands::Entity::update_many()
            .filter(bands::Column::Id.eq(band_id))
            .col_expr(bands::Column::ChartStatus, Expr::value(&update.status))
            .col_expr(bands::Column::ChartDenialReason, Expr::value(update.denial_reason.as_deref()))
            .col_expr(bands::Column::ChartStatusNote, Expr::value(update.note.as_deref()))
            .col_expr(bands::Column::ChartStatusAt, Expr::value(Utc::now().naive_utc()))
            .col_expr(bands::Column::ChartStatusBy, Expr::value(user_id))
            .exec(db)
            .await?;

        ActionLogService::record(
            db,
            action_types::CHART_STATUS_CHANGE,
            entity_types::BAND,
            band_id,
            user_id,
            Some(serde_json::json!({ "chart_status": old_status })),
            Some(serde_json::json!({
                "chart_status": update.status,
                "denial_reason": update.denial_reason,
                "note": update.note,
            })),
            None,
            ip_address,
        )
        .await?;

        Ok(StatusUpdateResult {
            success: true,
            message: format!("Band chart status updated to '{}'", update.status),
            warning,
        })
    }

    // ========== ALBUMS ==========

    /// Update an album's data status
    pub async fn update_album_data_status(
        db: &DatabaseConnection,
        album_id: u32,
        update: DataStatusUpdate,
        user_id: Option<u32>,
        ip_address: Option<String>,
    ) -> Result<StatusUpdateResult, DbErr> {
        let album = albums::Entity::find_by_id(album_id)
            .one(db)
            .await?
            .ok_or_else(|| DbErr::RecordNotFound(format!("Album {} not found", album_id)))?;

        let old_status = album.data_status.clone();

        albums::Entity::update_many()
            .filter(albums::Column::Id.eq(album_id))
            .col_expr(albums::Column::DataStatus, Expr::value(&update.status))
            .col_expr(albums::Column::DataStatusReason, Expr::value(update.reason.as_deref()))
            .col_expr(albums::Column::DataStatusNote, Expr::value(update.note.as_deref()))
            .col_expr(albums::Column::DataStatusAt, Expr::value(Utc::now().naive_utc()))
            .col_expr(albums::Column::DataStatusBy, Expr::value(user_id))
            .exec(db)
            .await?;

        ActionLogService::record(
            db,
            action_types::DATA_STATUS_CHANGE,
            entity_types::ALBUM,
            album_id,
            user_id,
            Some(serde_json::json!({ "data_status": old_status })),
            Some(serde_json::json!({
                "data_status": update.status,
                "reason": update.reason,
                "note": update.note,
            })),
            None,
            ip_address,
        )
        .await?;

        Ok(StatusUpdateResult {
            success: true,
            message: format!("Album data status updated to '{}'", update.status),
            warning: None,
        })
    }

    /// Update an album's chart status
    pub async fn update_album_chart_status(
        db: &DatabaseConnection,
        album_id: u32,
        update: ChartStatusUpdate,
        user_id: Option<u32>,
        ip_address: Option<String>,
    ) -> Result<StatusUpdateResult, DbErr> {
        let album = albums::Entity::find_by_id(album_id)
            .one(db)
            .await?
            .ok_or_else(|| DbErr::RecordNotFound(format!("Album {} not found", album_id)))?;

        if update.status == chart_status::APPROVED && album.data_status == data_status::DUPLICATE_DETECTED {
            return Err(DbErr::Custom(
                "Cannot approve for charting while duplicate status is detected.".to_string()
            ));
        }

        let old_status = album.chart_status.clone();
        let mut warning = None;

        if update.status == chart_status::APPROVED && album.data_status != data_status::VALIDATED {
            warning = Some("Entity approved for charting but data has not been validated.".to_string());
        }

        albums::Entity::update_many()
            .filter(albums::Column::Id.eq(album_id))
            .col_expr(albums::Column::ChartStatus, Expr::value(&update.status))
            .col_expr(albums::Column::ChartDenialReason, Expr::value(update.denial_reason.as_deref()))
            .col_expr(albums::Column::ChartStatusNote, Expr::value(update.note.as_deref()))
            .col_expr(albums::Column::ChartStatusAt, Expr::value(Utc::now().naive_utc()))
            .col_expr(albums::Column::ChartStatusBy, Expr::value(user_id))
            .exec(db)
            .await?;

        ActionLogService::record(
            db,
            action_types::CHART_STATUS_CHANGE,
            entity_types::ALBUM,
            album_id,
            user_id,
            Some(serde_json::json!({ "chart_status": old_status })),
            Some(serde_json::json!({
                "chart_status": update.status,
                "denial_reason": update.denial_reason,
                "note": update.note,
            })),
            None,
            ip_address,
        )
        .await?;

        Ok(StatusUpdateResult {
            success: true,
            message: format!("Album chart status updated to '{}'", update.status),
            warning,
        })
    }

    // ========== SONGS ==========

    /// Update a song's data status
    pub async fn update_song_data_status(
        db: &DatabaseConnection,
        song_id: u32,
        update: DataStatusUpdate,
        user_id: Option<u32>,
        ip_address: Option<String>,
    ) -> Result<StatusUpdateResult, DbErr> {
        let song = songs::Entity::find_by_id(song_id)
            .one(db)
            .await?
            .ok_or_else(|| DbErr::RecordNotFound(format!("Song {} not found", song_id)))?;

        let old_status = song.data_status.clone();

        songs::Entity::update_many()
            .filter(songs::Column::Id.eq(song_id))
            .col_expr(songs::Column::DataStatus, Expr::value(&update.status))
            .col_expr(songs::Column::DataStatusReason, Expr::value(update.reason.as_deref()))
            .col_expr(songs::Column::DataStatusNote, Expr::value(update.note.as_deref()))
            .col_expr(songs::Column::DataStatusAt, Expr::value(Utc::now().naive_utc()))
            .col_expr(songs::Column::DataStatusBy, Expr::value(user_id))
            .exec(db)
            .await?;

        ActionLogService::record(
            db,
            action_types::DATA_STATUS_CHANGE,
            entity_types::SONG,
            song_id,
            user_id,
            Some(serde_json::json!({ "data_status": old_status })),
            Some(serde_json::json!({
                "data_status": update.status,
                "reason": update.reason,
                "note": update.note,
            })),
            None,
            ip_address,
        )
        .await?;

        Ok(StatusUpdateResult {
            success: true,
            message: format!("Song data status updated to '{}'", update.status),
            warning: None,
        })
    }

    /// Update a song's chart status
    pub async fn update_song_chart_status(
        db: &DatabaseConnection,
        song_id: u32,
        update: ChartStatusUpdate,
        user_id: Option<u32>,
        ip_address: Option<String>,
    ) -> Result<StatusUpdateResult, DbErr> {
        let song = songs::Entity::find_by_id(song_id)
            .one(db)
            .await?
            .ok_or_else(|| DbErr::RecordNotFound(format!("Song {} not found", song_id)))?;

        if update.status == chart_status::APPROVED && song.data_status == data_status::DUPLICATE_DETECTED {
            return Err(DbErr::Custom(
                "Cannot approve for charting while duplicate status is detected.".to_string()
            ));
        }

        let old_status = song.chart_status.clone();
        let mut warning = None;

        if update.status == chart_status::APPROVED && song.data_status != data_status::VALIDATED {
            warning = Some("Entity approved for charting but data has not been validated.".to_string());
        }

        songs::Entity::update_many()
            .filter(songs::Column::Id.eq(song_id))
            .col_expr(songs::Column::ChartStatus, Expr::value(&update.status))
            .col_expr(songs::Column::ChartDenialReason, Expr::value(update.denial_reason.as_deref()))
            .col_expr(songs::Column::ChartStatusNote, Expr::value(update.note.as_deref()))
            .col_expr(songs::Column::ChartStatusAt, Expr::value(Utc::now().naive_utc()))
            .col_expr(songs::Column::ChartStatusBy, Expr::value(user_id))
            .exec(db)
            .await?;

        ActionLogService::record(
            db,
            action_types::CHART_STATUS_CHANGE,
            entity_types::SONG,
            song_id,
            user_id,
            Some(serde_json::json!({ "chart_status": old_status })),
            Some(serde_json::json!({
                "chart_status": update.status,
                "denial_reason": update.denial_reason,
                "note": update.note,
            })),
            None,
            ip_address,
        )
        .await?;

        Ok(StatusUpdateResult {
            success: true,
            message: format!("Song chart status updated to '{}'", update.status),
            warning,
        })
    }

    // ========== RADIO STATIONS ==========

    /// Update a radio station's data status
    pub async fn update_radio_station_data_status(
        db: &DatabaseConnection,
        station_id: u32,
        update: DataStatusUpdate,
        user_id: Option<u32>,
        ip_address: Option<String>,
    ) -> Result<StatusUpdateResult, DbErr> {
        let station = radio_stations::Entity::find_by_id(station_id)
            .one(db)
            .await?
            .ok_or_else(|| DbErr::RecordNotFound(format!("Radio station {} not found", station_id)))?;

        let old_status = station.data_status.clone();

        radio_stations::Entity::update_many()
            .filter(radio_stations::Column::Id.eq(station_id))
            .col_expr(radio_stations::Column::DataStatus, Expr::value(&update.status))
            .col_expr(radio_stations::Column::DataStatusReason, Expr::value(update.reason.as_deref()))
            .col_expr(radio_stations::Column::DataStatusNote, Expr::value(update.note.as_deref()))
            .col_expr(radio_stations::Column::DataStatusAt, Expr::value(Utc::now().naive_utc()))
            .col_expr(radio_stations::Column::DataStatusBy, Expr::value(user_id))
            .exec(db)
            .await?;

        ActionLogService::record(
            db,
            action_types::DATA_STATUS_CHANGE,
            entity_types::RADIO_STATION,
            station_id,
            user_id,
            Some(serde_json::json!({ "data_status": old_status })),
            Some(serde_json::json!({
                "data_status": update.status,
                "reason": update.reason,
                "note": update.note,
            })),
            None,
            ip_address,
        )
        .await?;

        Ok(StatusUpdateResult {
            success: true,
            message: format!("Radio station data status updated to '{}'", update.status),
            warning: None,
        })
    }

    /// Update a radio station's chart status
    pub async fn update_radio_station_chart_status(
        db: &DatabaseConnection,
        station_id: u32,
        update: ChartStatusUpdate,
        user_id: Option<u32>,
        ip_address: Option<String>,
    ) -> Result<StatusUpdateResult, DbErr> {
        let station = radio_stations::Entity::find_by_id(station_id)
            .one(db)
            .await?
            .ok_or_else(|| DbErr::RecordNotFound(format!("Radio station {} not found", station_id)))?;

        if update.status == chart_status::APPROVED && station.data_status == data_status::DUPLICATE_DETECTED {
            return Err(DbErr::Custom(
                "Cannot approve for charting while duplicate status is detected.".to_string()
            ));
        }

        let old_status = station.chart_status.clone();
        let mut warning = None;

        if update.status == chart_status::APPROVED && station.data_status != data_status::VALIDATED {
            warning = Some("Entity approved for charting but data has not been validated.".to_string());
        }

        radio_stations::Entity::update_many()
            .filter(radio_stations::Column::Id.eq(station_id))
            .col_expr(radio_stations::Column::ChartStatus, Expr::value(&update.status))
            .col_expr(radio_stations::Column::ChartDenialReason, Expr::value(update.denial_reason.as_deref()))
            .col_expr(radio_stations::Column::ChartStatusNote, Expr::value(update.note.as_deref()))
            .col_expr(radio_stations::Column::ChartStatusAt, Expr::value(Utc::now().naive_utc()))
            .col_expr(radio_stations::Column::ChartStatusBy, Expr::value(user_id))
            .exec(db)
            .await?;

        ActionLogService::record(
            db,
            action_types::CHART_STATUS_CHANGE,
            entity_types::RADIO_STATION,
            station_id,
            user_id,
            Some(serde_json::json!({ "chart_status": old_status })),
            Some(serde_json::json!({
                "chart_status": update.status,
                "denial_reason": update.denial_reason,
                "note": update.note,
            })),
            None,
            ip_address,
        )
        .await?;

        Ok(StatusUpdateResult {
            success: true,
            message: format!("Radio station chart status updated to '{}'", update.status),
            warning,
        })
    }

    // ========== STAFF MEMBERS ==========

    /// Update a staff member's data status
    pub async fn update_staff_data_status(
        db: &DatabaseConnection,
        staff_id: u32,
        update: DataStatusUpdate,
        user_id: Option<u32>,
        ip_address: Option<String>,
    ) -> Result<StatusUpdateResult, DbErr> {
        let staff = staff_members::Entity::find_by_id(staff_id)
            .one(db)
            .await?
            .ok_or_else(|| DbErr::RecordNotFound(format!("Staff member {} not found", staff_id)))?;

        let old_status = staff.data_status.clone();

        staff_members::Entity::update_many()
            .filter(staff_members::Column::Id.eq(staff_id))
            .col_expr(staff_members::Column::DataStatus, Expr::value(&update.status))
            .col_expr(staff_members::Column::DataStatusReason, Expr::value(update.reason.as_deref()))
            .col_expr(staff_members::Column::DataStatusNote, Expr::value(update.note.as_deref()))
            .col_expr(staff_members::Column::DataStatusAt, Expr::value(Utc::now().naive_utc()))
            .col_expr(staff_members::Column::DataStatusBy, Expr::value(user_id))
            .exec(db)
            .await?;

        ActionLogService::record(
            db,
            action_types::DATA_STATUS_CHANGE,
            entity_types::STAFF_MEMBER,
            staff_id,
            user_id,
            Some(serde_json::json!({ "data_status": old_status })),
            Some(serde_json::json!({
                "data_status": update.status,
                "reason": update.reason,
                "note": update.note,
            })),
            None,
            ip_address,
        )
        .await?;

        Ok(StatusUpdateResult {
            success: true,
            message: format!("Staff member data status updated to '{}'", update.status),
            warning: None,
        })
    }

    /// Update a staff member's chart status
    pub async fn update_staff_chart_status(
        db: &DatabaseConnection,
        staff_id: u32,
        update: ChartStatusUpdate,
        user_id: Option<u32>,
        ip_address: Option<String>,
    ) -> Result<StatusUpdateResult, DbErr> {
        let staff = staff_members::Entity::find_by_id(staff_id)
            .one(db)
            .await?
            .ok_or_else(|| DbErr::RecordNotFound(format!("Staff member {} not found", staff_id)))?;

        if update.status == chart_status::APPROVED && staff.data_status == data_status::DUPLICATE_DETECTED {
            return Err(DbErr::Custom(
                "Cannot approve for charting while duplicate status is detected.".to_string()
            ));
        }

        let old_status = staff.chart_status.clone();
        let mut warning = None;

        if update.status == chart_status::APPROVED && staff.data_status != data_status::VALIDATED {
            warning = Some("Entity approved for charting but data has not been validated.".to_string());
        }

        staff_members::Entity::update_many()
            .filter(staff_members::Column::Id.eq(staff_id))
            .col_expr(staff_members::Column::ChartStatus, Expr::value(&update.status))
            .col_expr(staff_members::Column::ChartDenialReason, Expr::value(update.denial_reason.as_deref()))
            .col_expr(staff_members::Column::ChartStatusNote, Expr::value(update.note.as_deref()))
            .col_expr(staff_members::Column::ChartStatusAt, Expr::value(Utc::now().naive_utc()))
            .col_expr(staff_members::Column::ChartStatusBy, Expr::value(user_id))
            .exec(db)
            .await?;

        ActionLogService::record(
            db,
            action_types::CHART_STATUS_CHANGE,
            entity_types::STAFF_MEMBER,
            staff_id,
            user_id,
            Some(serde_json::json!({ "chart_status": old_status })),
            Some(serde_json::json!({
                "chart_status": update.status,
                "denial_reason": update.denial_reason,
                "note": update.note,
            })),
            None,
            ip_address,
        )
        .await?;

        Ok(StatusUpdateResult {
            success: true,
            message: format!("Staff member chart status updated to '{}'", update.status),
            warning,
        })
    }

    // ========== HELPER FUNCTIONS ==========

    /// Trigger needs_review status on a band (called when albums/songs are added)
    pub async fn trigger_band_needs_review(
        db: &DatabaseConnection,
        band_id: u32,
        reason: &str,
    ) -> Result<(), DbErr> {
        bands::Entity::update_many()
            .filter(bands::Column::Id.eq(band_id))
            .filter(bands::Column::DataStatus.eq(data_status::VALIDATED))
            .col_expr(bands::Column::DataStatus, Expr::value(data_status::NEEDS_REVIEW))
            .col_expr(bands::Column::DataStatusReason, Expr::value(reason))
            .col_expr(bands::Column::DataStatusAt, Expr::value(Utc::now().naive_utc()))
            .exec(db)
            .await?;
        Ok(())
    }

    /// Trigger needs_review status on an album (called when songs are added/removed)
    pub async fn trigger_album_needs_review(
        db: &DatabaseConnection,
        album_id: u32,
        reason: &str,
    ) -> Result<(), DbErr> {
        albums::Entity::update_many()
            .filter(albums::Column::Id.eq(album_id))
            .filter(albums::Column::DataStatus.eq(data_status::VALIDATED))
            .col_expr(albums::Column::DataStatus, Expr::value(data_status::NEEDS_REVIEW))
            .col_expr(albums::Column::DataStatusReason, Expr::value(reason))
            .col_expr(albums::Column::DataStatusAt, Expr::value(Utc::now().naive_utc()))
            .exec(db)
            .await?;
        Ok(())
    }

    /// Mark entity as duplicate_detected (called by duplicate scanner)
    pub async fn mark_duplicate_detected(
        db: &DatabaseConnection,
        entity_type: &str,
        entity_id: u32,
    ) -> Result<(), DbErr> {
        match entity_type {
            "band" => {
                bands::Entity::update_many()
                    .filter(bands::Column::Id.eq(entity_id))
                    .col_expr(bands::Column::DataStatus, Expr::value(data_status::DUPLICATE_DETECTED))
                    .col_expr(bands::Column::DataStatusReason, Expr::value(data_status_reason::DUPLICATE_SCAN))
                    .col_expr(bands::Column::DataStatusAt, Expr::value(Utc::now().naive_utc()))
                    .exec(db)
                    .await?;
            }
            "album" => {
                albums::Entity::update_many()
                    .filter(albums::Column::Id.eq(entity_id))
                    .col_expr(albums::Column::DataStatus, Expr::value(data_status::DUPLICATE_DETECTED))
                    .col_expr(albums::Column::DataStatusReason, Expr::value(data_status_reason::DUPLICATE_SCAN))
                    .col_expr(albums::Column::DataStatusAt, Expr::value(Utc::now().naive_utc()))
                    .exec(db)
                    .await?;
            }
            "song" => {
                songs::Entity::update_many()
                    .filter(songs::Column::Id.eq(entity_id))
                    .col_expr(songs::Column::DataStatus, Expr::value(data_status::DUPLICATE_DETECTED))
                    .col_expr(songs::Column::DataStatusReason, Expr::value(data_status_reason::DUPLICATE_SCAN))
                    .col_expr(songs::Column::DataStatusAt, Expr::value(Utc::now().naive_utc()))
                    .exec(db)
                    .await?;
            }
            _ => {}
        }
        Ok(())
    }
}
