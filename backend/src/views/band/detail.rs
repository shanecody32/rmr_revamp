//! Full band detail view with all relations.
//!
//! Used for individual band pages where complete data is needed.

use crate::models::bands::Model as BandModel;
use crate::models::genres::Model as GenreModel;
use crate::models::sub_genres::Model as SubGenreModel;
use crate::models::countries::Model as CountryModel;
use crate::models::states::Model as StateModel;
use crate::models::cities::Model as CityModel;
use crate::models::band_images::Model as BandImageModel;
use crate::services::AlbumResponse;
use serde::Serialize;
use utoipa::ToSchema;

/// Complete band data with all related entities.
///
/// This view includes full model data plus resolved relations.
/// Albums are optional and can be loaded separately via the discography endpoint.
#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct BandDetailView {
    /// Full band model data (flattened into response)
    #[serde(flatten)]
    pub band: BandModel,

    /// Associated genres (derived from sub_genres)
    pub genres: Vec<GenreModel>,

    /// Associated sub-genres
    pub sub_genres: Vec<SubGenreModel>,

    /// Resolved country relation
    pub country: Option<CountryModel>,

    /// Resolved state relation
    pub state: Option<StateModel>,

    /// Resolved city relation
    pub city: Option<CityModel>,

    /// Band images
    pub images: Vec<BandImageModel>,

    /// Discography (optional - only loaded when explicitly requested)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub albums: Option<Vec<AlbumResponse>>,
}

impl BandDetailView {
    /// Create a new detail view with all relations but no albums.
    pub fn new(
        band: BandModel,
        genres: Vec<GenreModel>,
        sub_genres: Vec<SubGenreModel>,
        country: Option<CountryModel>,
        state: Option<StateModel>,
        city: Option<CityModel>,
        images: Vec<BandImageModel>,
    ) -> Self {
        Self {
            band,
            genres,
            sub_genres,
            country,
            state,
            city,
            images,
            albums: None,
        }
    }

    /// Set the albums for this view.
    pub fn with_albums(mut self, albums: Vec<AlbumResponse>) -> Self {
        self.albums = Some(albums);
        self
    }
}
