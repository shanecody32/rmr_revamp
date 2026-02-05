//! Band service types and request/response structs.

use crate::models::bands::Model as BandModel;
use crate::models::genres::Model as GenreModel;
use crate::models::sub_genres::Model as SubGenreModel;
use crate::models::countries::Model as CountryModel;
use crate::models::states::Model as StateModel;
use crate::models::cities::Model as CityModel;
use crate::models::band_images::Model as BandImageModel;
use crate::services::AlbumResponse;
use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};

#[derive(Debug, Serialize, ToSchema, Clone)]
pub struct BandResponse {
    #[serde(flatten)]
    pub band: BandModel,
    pub genres: Vec<GenreModel>,
    pub sub_genres: Vec<SubGenreModel>,
    pub country: Option<CountryModel>,
    pub state: Option<StateModel>,
    pub city: Option<CityModel>,
    pub images: Vec<BandImageModel>,
    pub albums: Vec<AlbumResponse>,
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct BandFilterParams {
    pub page: Option<u64>,
    pub page_size: Option<u64>,
    pub name: Option<String>,
    pub name_filter_type: Option<String>,
    pub country_id: Option<u32>,
    pub state_id: Option<u32>,
    pub city_id: Option<u32>,
    pub genre_id: Option<u32>,
    pub sub_genre_id: Option<u32>,
    pub verified: Option<bool>,
    pub approved: Option<bool>,
    pub sort_field: Option<String>,
    pub sort_ascending: Option<bool>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct MergeBandsRequest {
    pub from_ids: Vec<u32>,
    pub into_id: u32,
    pub merged_data: serde_json::Value,
}

/// Statistics about what was moved during a merge
#[derive(Debug, Serialize, ToSchema, Default)]
pub struct MergeStats {
    pub images_moved: u32,
    pub links_moved: u32,
    pub aliases_moved: u32,
    pub songs_moved: u32,
    pub albums_moved: u32,
    pub reviews_moved: u32,
    pub users_moved: u32,
    pub sub_genres_added: u32,
    pub radio_playlists_moved: u32,
    pub radio_playlists_aggregated: u32,
    pub radio_playlist_archives_moved: u32,
    pub radio_playlist_archives_aggregated: u32,
    pub staff_playlists_moved: u32,
    pub staff_playlists_aggregated: u32,
    pub staff_playlist_archives_moved: u32,
    pub staff_playlist_archives_aggregated: u32,
    pub raw_data_updated: u32,
    pub song_aliases_moved: u32,
    pub song_aliases_deduped: u32,
    pub album_aliases_moved: u32,
    pub album_aliases_deduped: u32,
    pub duplicate_candidates_updated: u32,
    pub duplicate_candidates_cleaned: u32,
    pub bands_deleted: u32,
}

/// Duplicate song found during merge (same name in target band)
#[derive(Debug, Serialize, ToSchema)]
pub struct SongDuplicate {
    pub from_song_id: u32,
    pub from_song_name: String,
    pub target_song_id: u32,
    pub target_song_name: String,
}

/// Duplicate album found during merge (same name in target band)
#[derive(Debug, Serialize, ToSchema)]
pub struct AlbumDuplicate {
    pub from_album_id: u32,
    pub from_album_name: String,
    pub target_album_id: u32,
    pub target_album_name: String,
}

/// Result of a merge operation
#[derive(Debug, Serialize, ToSchema)]
pub struct MergeResult {
    pub merged_band: BandModel,
    pub duplicate_songs: Vec<SongDuplicate>,
    pub duplicate_albums: Vec<AlbumDuplicate>,
    pub stats: MergeStats,
}
