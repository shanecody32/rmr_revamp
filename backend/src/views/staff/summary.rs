//! Staff summary view for embedding in other responses.

use serde::Serialize;
use utoipa::ToSchema;

/// Minimal staff data for embedding in other responses.
///
/// Used when staff members are referenced from other entities
/// (e.g., playlist entries, station details).
#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct StaffSummary {
    pub id: u32,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub on_air_name: Option<String>,
    pub position: Option<String>,
    pub image_url: Option<String>,
}

impl StaffSummary {
    /// Create a new staff summary.
    pub fn new(
        id: u32,
        first_name: Option<String>,
        last_name: Option<String>,
        on_air_name: Option<String>,
        position: Option<String>,
        image_url: Option<String>,
    ) -> Self {
        Self {
            id,
            first_name,
            last_name,
            on_air_name,
            position,
            image_url,
        }
    }

    /// Get the display name for this staff member.
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
