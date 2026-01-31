//! Lightweight band view for list/table displays.
//!
//! Uses partial model selection to fetch only essential columns,
//! reducing bandwidth and improving query performance.

use chrono::NaiveDateTime;
use sea_orm::FromQueryResult;
use serde::Serialize;
use utoipa::ToSchema;

/// Minimal band data for list/table views.
///
/// This partial model fetches only ~10 columns instead of 40+,
/// significantly reducing response size for paginated lists.
#[derive(Debug, Clone, Serialize, ToSchema, FromQueryResult)]
pub struct BandListView {
    pub id: u32,
    pub name: String,
    pub slug: Option<String>,
    pub verified: i8,
    pub approved: i8,
    pub country_id: Option<u32>,
    pub state_id: Option<u32>,
    pub city_id: Option<u32>,
    pub created: Option<NaiveDateTime>,
    pub modified: Option<NaiveDateTime>,
}

/// Band list view enriched with resolved location names and genres.
///
/// This is the typical response format for list endpoints, where
/// we need to display human-readable location and genre information
/// without loading the full entity relations.
#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct BandListViewEnriched {
    #[serde(flatten)]
    pub band: BandListView,
    pub country_name: Option<String>,
    pub state_name: Option<String>,
    pub city_name: Option<String>,
    pub genre_names: Vec<String>,
    pub sub_genre_names: Vec<String>,
    pub image_url: Option<String>,
}

impl BandListViewEnriched {
    /// Create an enriched view from base data and resolved names.
    pub fn new(
        band: BandListView,
        country_name: Option<String>,
        state_name: Option<String>,
        city_name: Option<String>,
        genre_names: Vec<String>,
        sub_genre_names: Vec<String>,
        image_url: Option<String>,
    ) -> Self {
        Self {
            band,
            country_name,
            state_name,
            city_name,
            genre_names,
            sub_genre_names,
            image_url,
        }
    }
}
