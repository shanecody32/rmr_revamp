//! Compact band summary for embedding in other responses.
//!
//! Used when bands appear as related entities in album or song responses.

use serde::Serialize;
use utoipa::ToSchema;

/// Minimal band information for embedding in other responses.
///
/// Used when showing band info within album or song views.
#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct BandSummary {
    pub id: u32,
    pub name: String,
    pub slug: Option<String>,
    pub country_name: Option<String>,
    pub image_url: Option<String>,
}

impl BandSummary {
    /// Create a new band summary.
    pub fn new(
        id: u32,
        name: String,
        slug: Option<String>,
        country_name: Option<String>,
        image_url: Option<String>,
    ) -> Self {
        Self {
            id,
            name,
            slug,
            country_name,
            image_url,
        }
    }
}
