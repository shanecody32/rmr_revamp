//! Full album detail view with all relations.

use crate::models::albums::Model as AlbumModel;
use crate::models::genres::Model as GenreModel;
use crate::models::sub_genres::Model as SubGenreModel;
use crate::models::album_images::Model as AlbumImageModel;
use crate::views::band::BandSummary;
use serde::Serialize;
use utoipa::ToSchema;

/// Song with track information for album detail view.
#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct SongInAlbum {
    pub id: u32,
    pub name: Option<String>,
    pub duration: Option<i32>,
    pub track_number: Option<i32>,
    pub disc_number: Option<i32>,
    pub sub_genre_name: Option<String>,
}

/// Complete album data with all related entities.
#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct AlbumDetailView {
    #[serde(flatten)]
    pub album: AlbumModel,
    pub genres: Vec<GenreModel>,
    pub sub_genres: Vec<SubGenreModel>,
    pub images: Vec<AlbumImageModel>,
    pub bands: Vec<BandSummary>,
    pub songs: Vec<SongInAlbum>,
    pub label_name: Option<String>,
}

impl AlbumDetailView {
    /// Create a new detail view.
    pub fn new(
        album: AlbumModel,
        genres: Vec<GenreModel>,
        sub_genres: Vec<SubGenreModel>,
        images: Vec<AlbumImageModel>,
        bands: Vec<BandSummary>,
        songs: Vec<SongInAlbum>,
        label_name: Option<String>,
    ) -> Self {
        Self {
            album,
            genres,
            sub_genres,
            images,
            bands,
            songs,
            label_name,
        }
    }
}
