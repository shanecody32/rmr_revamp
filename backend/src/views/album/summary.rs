//! Compact album summary for embedding in other responses.

use chrono::NaiveDate;
use serde::Serialize;
use utoipa::ToSchema;

/// Minimal album information for embedding in other responses.
///
/// Used when showing album info within band discography views.
#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct AlbumSummary {
    pub id: u32,
    pub name: Option<String>,
    pub slug: Option<String>,
    pub release_date: Option<NaiveDate>,
    /// The raw `img` field from the albums table (external link).
    /// Kept for backward compatibility; prefer `image_url` for display.
    pub img: Option<String>,
    /// Resolved image URL for display. Uses album_images table first,
    /// then falls back to the album.img external link field.
    // TODO: Improve image handling - album.img is an external link from the old system.
    // In the future, all images should come from the album_images table exclusively.
    pub image_url: Option<String>,
    pub song_count: usize,
    pub genre_name: Option<String>,
}

impl AlbumSummary {
    /// Create a new album summary.
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        id: u32,
        name: Option<String>,
        slug: Option<String>,
        release_date: Option<NaiveDate>,
        img: Option<String>,
        image_url: Option<String>,
        song_count: usize,
        genre_name: Option<String>,
    ) -> Self {
        Self {
            id,
            name,
            slug,
            release_date,
            img,
            image_url,
            song_count,
            genre_name,
        }
    }
}
