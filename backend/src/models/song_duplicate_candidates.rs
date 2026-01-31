//! `SeaORM` Entity for song duplicate candidates

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel, Deserialize, Serialize, ToSchema)]
#[sea_orm(table_name = "song_duplicate_candidates")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: u32,
    #[sea_orm(column_name = "song_id1")]
    pub song_id_1: u32,
    #[sea_orm(column_name = "song_id2")]
    pub song_id_2: u32,
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
        belongs_to = "super::songs::Entity",
        from = "Column::SongId1",
        to = "super::songs::Column::Id"
    )]
    Song1,
    #[sea_orm(
        belongs_to = "super::songs::Entity",
        from = "Column::SongId2",
        to = "super::songs::Column::Id"
    )]
    Song2,
}

impl ActiveModelBehavior for ActiveModel {}
