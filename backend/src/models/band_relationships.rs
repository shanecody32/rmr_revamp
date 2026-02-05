//! `SeaORM` Entity for band_relationships table
//! Links collaboration bands to their constituent member bands

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel, Deserialize, Serialize, ToSchema)]
#[sea_orm(table_name = "band_relationships")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: u32,
    /// The collaboration/group band (e.g., "Willie Nelson & Dolly Parton")
    pub parent_band_id: u32,
    /// A constituent member band (e.g., "Willie Nelson")
    pub member_band_id: u32,
    /// Type of relationship (default: "member")
    pub relationship_type: String,
    pub created: Option<DateTime>,
    pub modified: Option<DateTime>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::bands::Entity",
        from = "Column::ParentBandId",
        to = "super::bands::Column::Id"
    )]
    ParentBand,
    #[sea_orm(
        belongs_to = "super::bands::Entity",
        from = "Column::MemberBandId",
        to = "super::bands::Column::Id"
    )]
    MemberBand,
}

impl ActiveModelBehavior for ActiveModel {}
