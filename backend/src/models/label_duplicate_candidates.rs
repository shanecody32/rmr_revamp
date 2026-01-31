//! `SeaORM` Entity for label duplicate candidates

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel, Deserialize, Serialize, ToSchema)]
#[sea_orm(table_name = "label_duplicate_candidates")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: u32,
    #[sea_orm(column_name = "label_id1")]
    pub label_id_1: u32,
    #[sea_orm(column_name = "label_id2")]
    pub label_id_2: u32,
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
        belongs_to = "super::labels::Entity",
        from = "Column::LabelId1",
        to = "super::labels::Column::Id"
    )]
    Label1,
    #[sea_orm(
        belongs_to = "super::labels::Entity",
        from = "Column::LabelId2",
        to = "super::labels::Column::Id"
    )]
    Label2,
}

impl ActiveModelBehavior for ActiveModel {}
