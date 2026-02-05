//! `SeaORM` Entity for song_artists table
//! Proper band-linked artist credits for songs (primary, featured, remix_by)

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

/// Role of an artist on a song
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
pub enum SongArtistRole {
    #[serde(rename = "primary")]
    Primary,
    #[serde(rename = "featured")]
    Featured,
    #[serde(rename = "remix_by")]
    RemixBy,
}

impl From<String> for SongArtistRole {
    fn from(s: String) -> Self {
        match s.as_str() {
            "featured" => SongArtistRole::Featured,
            "remix_by" => SongArtistRole::RemixBy,
            _ => SongArtistRole::Primary,
        }
    }
}

impl From<SongArtistRole> for String {
    fn from(role: SongArtistRole) -> Self {
        match role {
            SongArtistRole::Primary => "primary".to_string(),
            SongArtistRole::Featured => "featured".to_string(),
            SongArtistRole::RemixBy => "remix_by".to_string(),
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel, Deserialize, Serialize, ToSchema)]
#[sea_orm(table_name = "song_artists")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: u32,
    pub song_id: u32,
    pub band_id: u32,
    /// Role: "primary", "featured", or "remix_by"
    pub role: String,
    pub created: Option<DateTime>,
    pub modified: Option<DateTime>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::songs::Entity",
        from = "Column::SongId",
        to = "super::songs::Column::Id"
    )]
    Song,
    #[sea_orm(
        belongs_to = "super::bands::Entity",
        from = "Column::BandId",
        to = "super::bands::Column::Id"
    )]
    Band,
}

impl Related<super::songs::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Song.def()
    }
}

impl Related<super::bands::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Band.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
