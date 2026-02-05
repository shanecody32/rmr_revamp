//! Album service types and request/response structs.

use crate::models::albums::Model as AlbumModel;
use crate::models::albums_songs::Model as AlbumSongModel;
use crate::models::songs::Model as SongModel;
use crate::models::genres::Model as GenreModel;
use crate::models::sub_genres::Model as SubGenreModel;
use crate::models::album_images::Model as AlbumImageModel;
use crate::models::bands::Model as BandModel;
use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};
use std::collections::HashSet;

/// Default chunk size for batched album genre processing.
/// MariaDB has a limit of 65,535 placeholders per prepared statement,
/// so we keep this under that limit for IN clauses.
pub const DEFAULT_BATCH_CHUNK_SIZE: u64 = 10_000;

/// Get the chunk size from environment variable or use default
pub fn get_batch_chunk_size() -> u64 {
    std::env::var("ALBUM_GENRE_CHUNK_SIZE")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(DEFAULT_BATCH_CHUNK_SIZE)
}

#[derive(Debug, Serialize, ToSchema)]
pub enum GenreUpdateResult {
    Updated {
        old_genre_id: Option<u32>,
        new_genre_id: u32,
    },
    AdminSetMismatch {
        current_genre_id: Option<u32>,
        suggested_genre_id: u32,
        counts: std::collections::HashMap<u32, u32>,
    },
    NoSongs,
    NoValidGenres,
    AlreadyCorrect,
}

#[derive(Debug, Serialize, ToSchema, Clone)]
pub struct SongWithTrackInfo {
    #[serde(flatten)]
    pub album_song: AlbumSongModel,
    pub song: SongModel,
    pub sub_genre: Option<SubGenreModel>,
}

#[derive(Debug, Serialize, ToSchema, Clone)]
pub struct AlbumResponse {
    #[serde(flatten)]
    pub album: AlbumModel,
    pub songs: Vec<SongWithTrackInfo>,
    pub genres: Vec<GenreModel>,
    pub sub_genres: Vec<SubGenreModel>,
    pub images: Vec<AlbumImageModel>,
    pub bands: Vec<BandModel>,
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct AlbumFilterParams {
    pub page: Option<u64>,
    pub page_size: Option<u64>,
    pub name: Option<String>,
    pub name_filter_type: Option<String>,
    pub verified: Option<bool>,
    pub approved: Option<bool>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct AlbumSongInput {
    pub song_id: u32,
    pub track_number: Option<i32>,
    pub disc_number: Option<i32>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct UpdateAlbumRequest {
    pub name: Option<String>,
    pub release_date: Option<String>,
    pub label_id: Option<u32>,
    pub itunes_url: Option<String>,
    pub cdbaby_url: Option<String>,
    pub amazon_url: Option<String>,
    pub itunes_id: Option<u32>,
    pub rovi_id: Option<String>,
    pub about: Option<String>,
    pub thanks: Option<String>,
    pub producer: Option<String>,
    pub engineer: Option<String>,
    pub studio: Option<String>,
    pub master: Option<String>,
    pub verified: Option<i8>,
    pub approved: Option<i8>,
    pub songs: Option<Vec<AlbumSongInput>>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct MergeAlbumsRequest {
    pub from_ids: Vec<u32>,
    pub into_id: u32,
    pub merged_data: serde_json::Value,
}

#[derive(Debug, Serialize, ToSchema, Default)]
pub struct AlbumMergeStats {
    pub images_moved: u32,
    pub images_deduped: u32,
    pub band_associations_moved: u32,
    pub band_associations_deduped: u32,
    pub song_associations_moved: u32,
    pub song_associations_deduped: u32,
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
    pub rankings_moved: u32,
    pub total_stats_moved: u32,
    pub weekly_stats_moved: u32,
    pub aliases_moved: u32,
    pub aliases_deduped: u32,
    pub duplicate_candidates_updated: u32,
    pub duplicate_candidates_cleaned: u32,
    pub albums_deleted: u32,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct AlbumMergeResult {
    pub merged_album: AlbumModel,
    pub stats: AlbumMergeStats,
}

/// Internal struct for tracking computed genre updates before applying to DB
pub(super) struct AlbumGenreComputed {
    pub album_id: u32,
    pub new_charting_genre: Option<u32>,
    pub sub_genre_ids: HashSet<u32>,
    pub needs_update: bool,
}
