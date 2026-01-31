//! `SeaORM` Entity for band duplicate candidates

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel, Deserialize, Serialize, ToSchema)]
#[sea_orm(table_name = "band_duplicate_candidates")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: u32,
    #[sea_orm(column_name = "band_id1")]
    pub band_id_1: u32,
    #[sea_orm(column_name = "band_id2")]
    pub band_id_2: u32,
    pub similarity_score: i32,
    #[sea_orm(column_type = "Json", nullable)]
    pub match_reasons: Option<serde_json::Value>,
    pub status: String,
    pub reviewed_by: Option<u32>,
    pub reviewed_at: Option<DateTime>,
    pub detected_at: DateTime,
    #[sea_orm(column_type = "Json", nullable)]
    pub scan_settings: Option<serde_json::Value>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::bands::Entity",
        from = "Column::BandId1",
        to = "super::bands::Column::Id"
    )]
    Band1,
    #[sea_orm(
        belongs_to = "super::bands::Entity",
        from = "Column::BandId2",
        to = "super::bands::Column::Id"
    )]
    Band2,
}

impl ActiveModelBehavior for ActiveModel {}

/// Status values for duplicate candidates
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "lowercase")]
pub enum CandidateStatus {
    Pending,
    Reviewed,
    Dismissed,
    Merged,
}

impl From<&str> for CandidateStatus {
    fn from(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "pending" => CandidateStatus::Pending,
            "reviewed" => CandidateStatus::Reviewed,
            "dismissed" => CandidateStatus::Dismissed,
            "merged" => CandidateStatus::Merged,
            _ => CandidateStatus::Pending,
        }
    }
}

impl std::fmt::Display for CandidateStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            CandidateStatus::Pending => write!(f, "pending"),
            CandidateStatus::Reviewed => write!(f, "reviewed"),
            CandidateStatus::Dismissed => write!(f, "dismissed"),
            CandidateStatus::Merged => write!(f, "merged"),
        }
    }
}
