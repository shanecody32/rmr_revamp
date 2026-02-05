//! Band service module.
//!
//! This module provides all band-related operations including:
//! - Listing and querying bands
//! - Getting band details with relations
//! - Creating and updating bands
//! - Finding similar bands (phonetic search)
//! - Merging duplicate bands

mod types;
mod queries;
mod detail;
mod relations;
mod create_update;
mod similarity;
mod merge;

// Re-export types
pub use types::{
    BandResponse,
    BandFilterParams,
    MergeBandsRequest,
    MergeStats,
    SongDuplicate,
    AlbumDuplicate,
    MergeResult,
};

use crate::models::bands::Model as BandModel;
use crate::views::band::{BandDetailView, BandListViewEnriched};
use crate::views::album::AlbumSummary;
use crate::services::AlbumResponse;
use crate::services::types::{PaginatedResponse, SimilarityParams, SimilarResult};
use sea_orm::{DatabaseConnection, DbErr};

/// Band service providing all band-related operations.
pub struct BandService;

impl BandService {
    /// Get paginated list of bands with full relations.
    pub async fn get_bands(
        db: &DatabaseConnection,
        params: BandFilterParams,
    ) -> Result<PaginatedResponse<BandResponse>, DbErr> {
        queries::get_bands(db, params).await
    }

    /// Get paginated list of bands with minimal data (optimized for table displays).
    pub async fn get_bands_list(
        db: &DatabaseConnection,
        params: BandFilterParams,
    ) -> Result<PaginatedResponse<BandListViewEnriched>, DbErr> {
        queries::get_bands_list(db, params).await
    }

    /// Get band by ID with optional album loading.
    pub async fn get_band_by_id_detailed(
        db: &DatabaseConnection,
        id: u32,
        include_albums: bool,
    ) -> Result<Option<BandDetailView>, DbErr> {
        detail::get_band_by_id_detailed(db, id, include_albums).await
    }

    /// Get band discography as album summaries (lightweight).
    pub async fn get_band_discography_summary(
        db: &DatabaseConnection,
        band_id: u32,
    ) -> Result<Vec<AlbumSummary>, DbErr> {
        detail::get_band_discography_summary(db, band_id).await
    }

    /// Get band by ID with full relations (legacy endpoint).
    pub async fn get_band_by_id(db: &DatabaseConnection, id: u32) -> Result<Option<BandResponse>, DbErr> {
        detail::get_band_by_id(db, id).await
    }

    /// Load relations for a list of bands.
    pub async fn load_band_relations(
        db: &DatabaseConnection,
        bands: Vec<BandModel>,
    ) -> Result<Vec<BandResponse>, DbErr> {
        relations::load_band_relations(db, bands).await
    }

    /// Create a new band.
    pub async fn create_band(db: &DatabaseConnection, data: BandModel) -> Result<BandModel, DbErr> {
        create_update::create_band(db, data).await
    }

    /// Create a band alias for similarity search indexing.
    pub async fn create_band_alias(
        db: &DatabaseConnection,
        band_id: u32,
        name: &str,
    ) -> Result<(), DbErr> {
        create_update::create_band_alias(db, band_id, name).await
    }

    /// Update an existing band.
    pub async fn update_band(db: &DatabaseConnection, id: u32, data: BandModel) -> Result<BandModel, DbErr> {
        create_update::update_band(db, id, data).await
    }

    /// Find similar bands using phonetic matching.
    pub async fn get_similar_bands(
        db: &DatabaseConnection,
        params: SimilarityParams,
    ) -> Result<Vec<SimilarResult<BandResponse>>, DbErr> {
        similarity::get_similar_bands(db, params).await
    }

    /// Merge multiple bands into a target band.
    pub async fn merge_bands(
        db: &DatabaseConnection,
        req: MergeBandsRequest,
        user_id: Option<u32>,
        ip_address: Option<String>,
    ) -> Result<MergeResult, DbErr> {
        merge::merge_bands(db, req, user_id, ip_address).await
    }

    /// Get full discography for a band.
    pub async fn get_band_discography(db: &DatabaseConnection, id: u32) -> Result<Vec<AlbumResponse>, DbErr> {
        relations::get_band_discography(db, id).await
    }

    /// Get band images by band ID.
    pub async fn get_band_images(
        db: &DatabaseConnection,
        band_id: u32,
    ) -> Result<Vec<crate::models::band_images::Model>, DbErr> {
        relations::get_band_images(db, band_id).await
    }
}
