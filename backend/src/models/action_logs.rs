//! Action log model for auditing merge, transfer, and other operations.

use sea_orm::entity::prelude::*;
use serde::Serialize;
use utoipa::ToSchema;

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel, Serialize, ToSchema)]
#[sea_orm(table_name = "action_logs")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: u32,
    /// Type of action (e.g., "staff_member.merge", "staff_member.transfer")
    #[sea_orm(column_type = "String(StringLen::N(100))")]
    pub action_type: String,
    /// Type of entity (e.g., "staff_member", "band")
    #[sea_orm(column_type = "String(StringLen::N(50))")]
    pub entity_type: String,
    /// ID of the primary entity involved
    pub entity_id: u32,
    /// User who performed the action (if authenticated)
    pub user_id: Option<u32>,
    /// State before the action (JSON)
    #[sea_orm(column_type = "Json", nullable)]
    pub before_snapshot: Option<serde_json::Value>,
    /// State after the action (JSON)
    #[sea_orm(column_type = "Json", nullable)]
    pub after_snapshot: Option<serde_json::Value>,
    /// Additional metadata specific to the action (JSON)
    #[sea_orm(column_type = "Json", nullable)]
    pub metadata: Option<serde_json::Value>,
    /// IP address of the request
    #[sea_orm(column_type = "String(StringLen::N(45))", nullable)]
    pub ip_address: Option<String>,
    /// When the action was performed
    pub created_at: DateTime,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::users::Entity",
        from = "Column::UserId",
        to = "super::users::Column::Id"
    )]
    User,
}

impl Related<super::users::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::User.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

/// Common action types for staff members
pub mod action_types {
    pub const STAFF_MERGE: &str = "staff_member.merge";
    pub const STAFF_TRANSFER: &str = "staff_member.transfer";
    pub const STAFF_ARCHIVE: &str = "staff_member.archive";
    pub const STAFF_UNARCHIVE: &str = "staff_member.unarchive";
    pub const STAFF_ADMIN_EDIT: &str = "staff_member.admin_edit";
    pub const BAND_MERGE: &str = "band.merge";
    pub const ALBUM_MERGE: &str = "album.merge";
    pub const SONG_MERGE: &str = "song.merge";
    pub const RADIO_STATION_MERGE: &str = "radio_station.merge";
    pub const LABEL_MERGE: &str = "label.merge";
}

/// Common entity types
pub mod entity_types {
    pub const STAFF_MEMBER: &str = "staff_member";
    pub const BAND: &str = "band";
    pub const ALBUM: &str = "album";
    pub const SONG: &str = "song";
    pub const RADIO_STATION: &str = "radio_station";
    pub const LABEL: &str = "label";
}
