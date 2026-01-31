//! `SeaORM` Entity for duplicate scan state

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Deserialize, Serialize)]
#[sea_orm(table_name = "duplicate_scan_state")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: u32,
    pub last_processed_band_id: u32,
    pub total_bands_scanned: u32,
    pub duplicates_found: u32,
    pub is_running: bool,
    pub started_at: Option<DateTime>,
    pub stopped_at: Option<DateTime>,
    pub stop_reason: Option<String>,
    #[sea_orm(column_type = "Text", nullable)]
    pub last_error: Option<String>,
    pub min_similarity: i32,
    #[sea_orm(column_type = "Decimal(Some((3, 2)))")]
    pub jw_weight: Decimal,
    #[sea_orm(column_type = "Decimal(Some((3, 2)))")]
    pub dice_weight: Decimal,
    pub max_duplicates_to_find: i32,
    pub batch_size: i32,
    pub delay_between_batches_ms: i32,
    pub continuous_mode: bool,
    pub continuous_delay_minutes: i32,
    pub updated_at: DateTime,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

/// Stop reason values for scan state
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum StopReason {
    Completed,
    LimitReached,
    UserStopped,
    Error,
}

impl From<&str> for StopReason {
    fn from(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "completed" => StopReason::Completed,
            "limit_reached" => StopReason::LimitReached,
            "user_stopped" => StopReason::UserStopped,
            "error" => StopReason::Error,
            _ => StopReason::Error,
        }
    }
}

impl std::fmt::Display for StopReason {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            StopReason::Completed => write!(f, "completed"),
            StopReason::LimitReached => write!(f, "limit_reached"),
            StopReason::UserStopped => write!(f, "user_stopped"),
            StopReason::Error => write!(f, "error"),
        }
    }
}
