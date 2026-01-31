use sea_orm::entity::prelude::*;
use serde::Serialize;

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel, Serialize)]
#[sea_orm(table_name = "staff_member_aliases")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: u32,
    pub staff_member_id: u32,
    pub radio_station_id: Option<u32>,
    pub name: String,
    pub slug: Option<String>,
    pub sanitized_name: Option<String>,
    pub soundex_key: Option<String>,
    pub phonetic_key: Option<String>,
    pub metaphone_key: Option<String>,
    pub dmetaphone_key: Option<String>,
    pub dmetaphone_alt_key: Option<String>,
    pub created: Option<DateTime>,
    pub modified: Option<DateTime>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::staff_members::Entity",
        from = "Column::StaffMemberId",
        to = "super::staff_members::Column::Id"
    )]
    StaffMember,
    #[sea_orm(
        belongs_to = "super::radio_stations::Entity",
        from = "Column::RadioStationId",
        to = "super::radio_stations::Column::Id"
    )]
    RadioStation,
}

impl Related<super::staff_members::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::StaffMember.def()
    }
}

impl Related<super::radio_stations::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::RadioStation.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
