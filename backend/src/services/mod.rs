pub mod user_service;
pub mod band;
pub mod album;

// Re-export BandService and types for backward compatibility
pub use band::{
    BandService, BandResponse, BandFilterParams, MergeBandsRequest,
    MergeStats, SongDuplicate, AlbumDuplicate, MergeResult,
};

// Re-export AlbumService and types for backward compatibility
pub use album::{
    AlbumService, AlbumResponse, SongWithTrackInfo, AlbumFilterParams,
    AlbumSongInput, UpdateAlbumRequest, MergeAlbumsRequest,
    AlbumMergeStats, AlbumMergeResult, GenreUpdateResult,
};

pub mod song_service;
pub mod genre_service;
pub mod location_service;
pub mod radio_station_service;
pub mod label_service;
pub mod staff_service;
pub mod auth_service;
pub mod duplicate_scan_service;
pub mod duplicate_scan_entity;
pub mod action_log_service;
pub mod transfer_service;
pub mod status_service;
pub mod staff_playlist_service;
pub mod types;
