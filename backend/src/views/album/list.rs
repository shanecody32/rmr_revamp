//! Lightweight album view for list/table displays.

use chrono::NaiveDate;
use sea_orm::FromQueryResult;
use serde::Serialize;
use utoipa::ToSchema;

/// Minimal album data for list/table views.
#[derive(Debug, Clone, Serialize, ToSchema, FromQueryResult)]
pub struct AlbumListView {
    pub id: u32,
    pub name: Option<String>,
    pub slug: Option<String>,
    pub release_date: Option<NaiveDate>,
    pub img: Option<String>,
    pub verified: i8,
    pub approved: i8,
    pub label_id: Option<u32>,
    pub sub_genre_for_charting: Option<u32>,
}

/// Album list view enriched with resolved names.
#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct AlbumListViewEnriched {
    #[serde(flatten)]
    pub album: AlbumListView,
    pub label_name: Option<String>,
    pub band_names: Vec<String>,
    pub genre_name: Option<String>,
    pub song_count: usize,
}

impl AlbumListViewEnriched {
    /// Create an enriched view from base data.
    pub fn new(
        album: AlbumListView,
        label_name: Option<String>,
        band_names: Vec<String>,
        genre_name: Option<String>,
        song_count: usize,
    ) -> Self {
        Self {
            album,
            label_name,
            band_names,
            genre_name,
            song_count,
        }
    }
}
