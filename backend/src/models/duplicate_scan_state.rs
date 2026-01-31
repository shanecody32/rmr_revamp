//! `SeaORM` Entity for duplicate scan state

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use std::fmt;
use std::str::FromStr;
use utoipa::ToSchema;

/// Entity type for duplicate scanning
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum ScanEntityType {
    Bands,
    Albums,
    Labels,
    RadioStations,
    StaffMembers,
}

impl fmt::Display for ScanEntityType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ScanEntityType::Bands => write!(f, "bands"),
            ScanEntityType::Albums => write!(f, "albums"),
            ScanEntityType::Labels => write!(f, "labels"),
            ScanEntityType::RadioStations => write!(f, "radio_stations"),
            ScanEntityType::StaffMembers => write!(f, "staff_members"),
        }
    }
}

impl FromStr for ScanEntityType {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().replace('-', "_").as_str() {
            "bands" => Ok(ScanEntityType::Bands),
            "albums" => Ok(ScanEntityType::Albums),
            "labels" => Ok(ScanEntityType::Labels),
            "radio_stations" => Ok(ScanEntityType::RadioStations),
            "staff_members" => Ok(ScanEntityType::StaffMembers),
            _ => Err(format!("Unknown entity type: {}", s)),
        }
    }
}

impl ScanEntityType {
    /// All supported entity types
    pub fn all() -> &'static [ScanEntityType] {
        &[
            ScanEntityType::Bands,
            ScanEntityType::Albums,
            ScanEntityType::Labels,
            ScanEntityType::RadioStations,
            ScanEntityType::StaffMembers,
        ]
    }

    /// Human-readable display name
    pub fn display_name(&self) -> &'static str {
        match self {
            ScanEntityType::Bands => "Bands",
            ScanEntityType::Albums => "Albums",
            ScanEntityType::Labels => "Labels",
            ScanEntityType::RadioStations => "Radio Stations",
            ScanEntityType::StaffMembers => "Staff Members",
        }
    }
}

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Deserialize, Serialize)]
#[sea_orm(table_name = "duplicate_scan_state")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: u32,
    pub entity_type: String,
    pub last_processed_id: u32,
    pub total_items_scanned: u32,
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
