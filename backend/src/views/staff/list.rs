//! Lightweight staff view for list/table displays.
//!
//! Uses partial model selection to fetch only essential columns,
//! reducing bandwidth and improving query performance.

use chrono::NaiveDateTime;
use sea_orm::FromQueryResult;
use serde::Serialize;
use utoipa::ToSchema;

/// Minimal staff data for list/table views.
///
/// This partial model fetches only ~12 columns instead of 40+,
/// significantly reducing response size for paginated lists.
#[derive(Debug, Clone, Serialize, ToSchema, FromQueryResult)]
pub struct StaffListView {
    pub id: u32,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub on_air_name: Option<String>,
    pub radio_station_id: Option<u32>,
    pub email: Option<String>,
    pub position: Option<String>,
    pub verified: i8,
    pub approved: i8,
    pub archived: i8,
    pub has_playlist: i8,
    pub created: Option<NaiveDateTime>,
    pub modified: Option<NaiveDateTime>,
}

impl StaffListView {
    /// Get the display name for this staff member.
    ///
    /// Returns on_air_name if available, otherwise "First Last".
    pub fn display_name(&self) -> String {
        if let Some(ref on_air) = self.on_air_name
            && !on_air.is_empty() {
                return on_air.clone();
            }

        let first = self.first_name.as_deref().unwrap_or("");
        let last = self.last_name.as_deref().unwrap_or("");

        match (first.is_empty(), last.is_empty()) {
            (false, false) => format!("{} {}", first, last),
            (false, true) => first.to_string(),
            (true, false) => last.to_string(),
            (true, true) => "Unknown".to_string(),
        }
    }
}

/// Staff list view enriched with resolved station name and sub-genres.
///
/// This is the typical response format for list endpoints, where
/// we need to display human-readable station and genre information
/// without loading the full entity relations.
#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct StaffListViewEnriched {
    #[serde(flatten)]
    pub staff: StaffListView,
    /// Resolved radio station name
    pub station_name: Option<String>,
    /// Sub-genre names for display
    pub sub_genre_names: Vec<String>,
    /// First image URL for display
    pub image_url: Option<String>,
    /// Whether this staff member is linked from a transfer (has transferred_from_id)
    pub is_transfer_target: bool,
    /// Whether this staff member was transferred to another (has transferred_to_id)
    pub is_transfer_source: bool,
}

impl StaffListViewEnriched {
    /// Create an enriched view from base data and resolved names.
    pub fn new(
        staff: StaffListView,
        station_name: Option<String>,
        sub_genre_names: Vec<String>,
        image_url: Option<String>,
        is_transfer_target: bool,
        is_transfer_source: bool,
    ) -> Self {
        Self {
            staff,
            station_name,
            sub_genre_names,
            image_url,
            is_transfer_target,
            is_transfer_source,
        }
    }
}
