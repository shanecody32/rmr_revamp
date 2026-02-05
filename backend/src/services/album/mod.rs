//! Album service module.
//!
//! This module provides all album-related operations including:
//! - Listing and querying albums
//! - Getting album details with relations
//! - Creating and updating albums
//! - Finding similar albums (phonetic search)
//! - Merging duplicate albums
//! - Calculating and updating album genres

mod types;
mod queries;
mod relations;
mod update;
mod similarity;
mod merge;
mod genre_update;

// Re-export types
pub use types::{
    AlbumResponse,
    SongWithTrackInfo,
    AlbumFilterParams,
    AlbumSongInput,
    UpdateAlbumRequest,
    MergeAlbumsRequest,
    AlbumMergeStats,
    AlbumMergeResult,
    GenreUpdateResult,
};

use crate::models::albums::Model as AlbumModel;
use crate::services::types::{PaginatedResponse, SimilarityParams, SimilarResult};
use crate::job_state::TaskJobState;
use sea_orm::{DatabaseConnection, DbErr, DeleteResult};
use std::sync::Arc;
use tokio::sync::RwLock;

/// Album service providing all album-related operations.
pub struct AlbumService;

impl AlbumService {
    /// Get paginated list of albums with full relations.
    pub async fn get_albums(
        db: &DatabaseConnection,
        params: AlbumFilterParams,
    ) -> Result<PaginatedResponse<AlbumResponse>, DbErr> {
        queries::get_albums(db, params).await
    }

    /// Get album by ID with full relations.
    pub async fn get_album_by_id(db: &DatabaseConnection, id: u32) -> Result<Option<AlbumResponse>, DbErr> {
        queries::get_album_by_id(db, id).await
    }

    /// Load relations for a list of albums.
    pub async fn load_album_relations(
        db: &DatabaseConnection,
        albums: Vec<AlbumModel>,
    ) -> Result<Vec<AlbumResponse>, DbErr> {
        relations::load_album_relations(db, albums).await
    }

    /// Create a new album.
    pub async fn create_album(db: &DatabaseConnection, data: AlbumModel, band_id: Option<u32>) -> Result<AlbumModel, DbErr> {
        relations::create_album(db, data, band_id).await
    }

    /// Create an album alias for similarity search indexing.
    pub async fn create_album_alias(
        db: &DatabaseConnection,
        album_id: u32,
        band_id: u32,
        name: &str,
    ) -> Result<(), DbErr> {
        relations::create_album_alias(db, album_id, band_id, name).await
    }

    /// Get songs for an album.
    pub async fn get_album_songs(db: &DatabaseConnection, id: u32) -> Result<Vec<crate::models::songs::Model>, DbErr> {
        relations::get_album_songs(db, id).await
    }

    /// Get or create an "Unknown" album for a specific band.
    pub async fn get_or_create_unknown_album(
        db: &DatabaseConnection,
        band_id: u32,
    ) -> Result<AlbumModel, DbErr> {
        relations::get_or_create_unknown_album(db, band_id).await
    }

    /// Update an album with basic fields.
    pub async fn update_album(db: &DatabaseConnection, id: u32, data: AlbumModel) -> Result<AlbumModel, DbErr> {
        update::update_album(db, id, data).await
    }

    /// Update an album with all fields from a request.
    pub async fn update_album_full(
        db: &DatabaseConnection,
        id: u32,
        req: UpdateAlbumRequest,
    ) -> Result<AlbumModel, DbErr> {
        update::update_album_full(db, id, req).await
    }

    /// Delete an album.
    pub async fn delete_album(db: &DatabaseConnection, id: u32) -> Result<DeleteResult, DbErr> {
        update::delete_album(db, id).await
    }

    /// Find similar albums using phonetic matching.
    pub async fn get_similar_albums(
        db: &DatabaseConnection,
        params: SimilarityParams,
    ) -> Result<Vec<SimilarResult<AlbumModel>>, DbErr> {
        similarity::get_similar_albums(db, params).await
    }

    /// Merge multiple albums into a target album.
    pub async fn merge_albums(
        db: &DatabaseConnection,
        req: MergeAlbumsRequest,
        user_id: Option<u32>,
        ip_address: Option<String>,
    ) -> Result<AlbumMergeResult, DbErr> {
        merge::merge_albums(db, req, user_id, ip_address).await
    }

    /// Determine and update the sub_genre_for_charting for a single album.
    pub async fn determine_sub_genre_for_charting(
        db: &DatabaseConnection,
        id: u32,
    ) -> Result<GenreUpdateResult, DbErr> {
        genre_update::determine_sub_genre_for_charting(db, id).await
    }

    /// Update all albums' genres (non-batched version).
    pub async fn update_all_albums_genres(
        db: &DatabaseConnection,
    ) -> Result<Vec<(u32, GenreUpdateResult)>, DbErr> {
        genre_update::update_all_albums_genres(db).await
    }

    /// Run album genre update as a background job (non-batched).
    pub async fn run_album_genre_update_background(
        db: DatabaseConnection,
        progress: Arc<RwLock<TaskJobState>>,
    ) -> Result<(), DbErr> {
        genre_update::run_album_genre_update_background(db, progress).await
    }

    /// Optimized batch processing for updating all album genres.
    pub async fn run_album_genre_update_background_batched(
        db: DatabaseConnection,
        progress: Arc<RwLock<TaskJobState>>,
    ) -> Result<(), DbErr> {
        genre_update::run_album_genre_update_background_batched(db, progress).await
    }
}
