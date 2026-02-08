//! Transfer service for moving songs between albums/bands and albums between bands.
//!
//! Handles cascading updates to playlists, archives, aliases, and triggers stats recalculation.

use crate::models::{
    action_logs::{action_types, entity_types},
    albums, albums_bands, albums_songs, bands, radio_playlist_archives, radio_playlists,
    radio_raw_datas, song_aliases, songs, staff_playlist_archives, staff_playlists,
};
use crate::services::action_log_service::ActionLogService;
use chrono::Utc;
use sea_orm::*;
use sea_orm::sea_query::Expr;
use serde::{Deserialize, Serialize};

/// Result of a transfer operation with affected row counts
#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
pub struct TransferResult {
    pub success: bool,
    pub affected: TransferAffectedCounts,
    pub message: String,
}

/// Counts of affected rows per table
#[derive(Debug, Clone, Default, Serialize, Deserialize, utoipa::ToSchema)]
pub struct TransferAffectedCounts {
    pub staff_playlists: u64,
    pub staff_playlist_archives: u64,
    pub radio_playlists: u64,
    pub radio_playlist_archives: u64,
    pub radio_raw_datas: u64,
    pub song_aliases: u64,
    pub album_aliases: u64,
    pub albums_songs: u64,
    pub albums_bands: u64,
    pub songs: u64,
}

/// Preview of what a transfer operation will affect
#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
pub struct TransferPreview {
    pub affected: TransferAffectedCounts,
    pub stats_recalc_album_ids: Vec<u32>,
    pub stats_recalc_song_ids: Vec<u32>,
}

pub struct TransferService;

impl TransferService {
    /// Preview the impact of transferring a song to a different album
    pub async fn preview_song_transfer_album(
        db: &DatabaseConnection,
        song_id: u32,
        target_album_id: u32,
    ) -> Result<TransferPreview, DbErr> {
        // Get current album(s) for the song
        let current_albums: Vec<albums_songs::Model> = albums_songs::Entity::find()
            .filter(albums_songs::Column::SongId.eq(song_id))
            .all(db)
            .await?;

        let current_album_ids: Vec<u32> = current_albums.iter().map(|a| a.album_id).collect();

        // Count affected rows
        let staff_playlists_count = staff_playlists::Entity::find()
            .filter(staff_playlists::Column::SongId.eq(song_id))
            .count(db)
            .await?;

        let staff_archives_count = staff_playlist_archives::Entity::find()
            .filter(staff_playlist_archives::Column::SongId.eq(song_id))
            .count(db)
            .await?;

        let radio_playlists_count = radio_playlists::Entity::find()
            .filter(radio_playlists::Column::SongId.eq(song_id))
            .count(db)
            .await?;

        let radio_archives_count = radio_playlist_archives::Entity::find()
            .filter(radio_playlist_archives::Column::SongId.eq(song_id))
            .count(db)
            .await?;

        let mut stats_album_ids = current_album_ids.clone();
        if !stats_album_ids.contains(&target_album_id) {
            stats_album_ids.push(target_album_id);
        }

        Ok(TransferPreview {
            affected: TransferAffectedCounts {
                staff_playlists: staff_playlists_count,
                staff_playlist_archives: staff_archives_count,
                radio_playlists: radio_playlists_count,
                radio_playlist_archives: radio_archives_count,
                albums_songs: current_albums.len() as u64,
                ..Default::default()
            },
            stats_recalc_album_ids: stats_album_ids,
            stats_recalc_song_ids: vec![song_id],
        })
    }

    /// Transfer a song to a different album
    ///
    /// Updates albums_songs junction, playlist tables, and triggers stats recalculation.
    pub async fn transfer_song_to_album(
        db: &DatabaseConnection,
        song_id: u32,
        target_album_id: u32,
        user_id: Option<u32>,
        ip_address: Option<String>,
    ) -> Result<TransferResult, DbErr> {
        // Verify song and album exist
        let song = songs::Entity::find_by_id(song_id)
            .one(db)
            .await?
            .ok_or_else(|| DbErr::RecordNotFound(format!("Song {} not found", song_id)))?;

        let target_album = albums::Entity::find_by_id(target_album_id)
            .one(db)
            .await?
            .ok_or_else(|| DbErr::RecordNotFound(format!("Album {} not found", target_album_id)))?;

        // Get current album associations
        let current_albums: Vec<albums_songs::Model> = albums_songs::Entity::find()
            .filter(albums_songs::Column::SongId.eq(song_id))
            .all(db)
            .await?;

        let source_album_ids: Vec<u32> = current_albums.iter().map(|a| a.album_id).collect();

        let txn = db.begin().await?;
        let mut affected = TransferAffectedCounts::default();

        // 1. Delete old albums_songs entries
        let delete_result = albums_songs::Entity::delete_many()
            .filter(albums_songs::Column::SongId.eq(song_id))
            .exec(&txn)
            .await?;
        affected.albums_songs = delete_result.rows_affected;

        // 2. Create new albums_songs entry
        let new_album_song = albums_songs::ActiveModel {
            album_id: Set(target_album_id),
            song_id: Set(song_id),
            track_num: Set(None),
            disc_count: Set(None),
            disc_number: Set(None),
            track_count: Set(None),
            track_number: Set(None),
            ..Default::default()
        };
        new_album_song.insert(&txn).await?;

        // 3. Update staff_playlists
        let staff_update = staff_playlists::Entity::update_many()
            .filter(staff_playlists::Column::SongId.eq(song_id))
            .col_expr(staff_playlists::Column::AlbumId, Expr::value(target_album_id))
            .exec(&txn)
            .await?;
        affected.staff_playlists = staff_update.rows_affected;

        // 4. Update staff_playlist_archives
        let staff_archive_update = staff_playlist_archives::Entity::update_many()
            .filter(staff_playlist_archives::Column::SongId.eq(song_id))
            .col_expr(staff_playlist_archives::Column::AlbumId, Expr::value(target_album_id))
            .exec(&txn)
            .await?;
        affected.staff_playlist_archives = staff_archive_update.rows_affected;

        // 5. Update radio_playlists
        let radio_update = radio_playlists::Entity::update_many()
            .filter(radio_playlists::Column::SongId.eq(song_id))
            .col_expr(radio_playlists::Column::AlbumId, Expr::value(target_album_id))
            .exec(&txn)
            .await?;
        affected.radio_playlists = radio_update.rows_affected;

        // 6. Update radio_playlist_archives
        let radio_archive_update = radio_playlist_archives::Entity::update_many()
            .filter(radio_playlist_archives::Column::SongId.eq(song_id))
            .col_expr(radio_playlist_archives::Column::AlbumId, Expr::value(target_album_id))
            .exec(&txn)
            .await?;
        affected.radio_playlist_archives = radio_archive_update.rows_affected;

        // 7. Mark source albums as needs_review
        for album_id in &source_album_ids {
            albums::Entity::update_many()
                .filter(albums::Column::Id.eq(*album_id))
                .col_expr(albums::Column::DataStatus, Expr::value("needs_review"))
                .col_expr(albums::Column::DataStatusReason, Expr::value("transfer"))
                .col_expr(albums::Column::DataStatusAt, Expr::value(Utc::now().naive_utc()))
                .col_expr(albums::Column::DataStatusBy, Expr::value(user_id))
                .exec(&txn)
                .await?;
        }

        // 8. Mark target album as needs_review
        albums::Entity::update_many()
            .filter(albums::Column::Id.eq(target_album_id))
            .col_expr(albums::Column::DataStatus, Expr::value("needs_review"))
            .col_expr(albums::Column::DataStatusReason, Expr::value("transfer"))
            .col_expr(albums::Column::DataStatusAt, Expr::value(Utc::now().naive_utc()))
            .col_expr(albums::Column::DataStatusBy, Expr::value(user_id))
            .exec(&txn)
            .await?;

        txn.commit().await?;

        // Log the action
        let metadata = serde_json::json!({
            "source_album_ids": source_album_ids,
            "target_album_id": target_album_id,
            "affected": affected,
        });

        ActionLogService::record(
            db,
            action_types::SONG_TRANSFER_ALBUM,
            entity_types::SONG,
            song_id,
            user_id,
            Some(serde_json::json!({ "album_ids": source_album_ids })),
            Some(serde_json::json!({ "album_id": target_album_id })),
            Some(metadata),
            ip_address,
        )
        .await?;

        // TODO: Trigger stats recalculation for affected albums
        // This would call StatsService::recalculate_album_stats for each album

        Ok(TransferResult {
            success: true,
            affected,
            message: format!(
                "Song '{}' transferred to album '{}'",
                song.name.unwrap_or_default(),
                target_album.name.unwrap_or_default()
            ),
        })
    }

    /// Preview the impact of transferring a song to a different band
    pub async fn preview_song_transfer_band(
        db: &DatabaseConnection,
        song_id: u32,
        _target_band_id: u32,
    ) -> Result<TransferPreview, DbErr> {
        let staff_playlists_count = staff_playlists::Entity::find()
            .filter(staff_playlists::Column::SongId.eq(song_id))
            .count(db)
            .await?;

        let staff_archives_count = staff_playlist_archives::Entity::find()
            .filter(staff_playlist_archives::Column::SongId.eq(song_id))
            .count(db)
            .await?;

        let radio_playlists_count = radio_playlists::Entity::find()
            .filter(radio_playlists::Column::SongId.eq(song_id))
            .count(db)
            .await?;

        let radio_archives_count = radio_playlist_archives::Entity::find()
            .filter(radio_playlist_archives::Column::SongId.eq(song_id))
            .count(db)
            .await?;

        let radio_raw_count = radio_raw_datas::Entity::find()
            .filter(radio_raw_datas::Column::SongId.eq(song_id))
            .count(db)
            .await?;

        let song_aliases_count = song_aliases::Entity::find()
            .filter(song_aliases::Column::SongId.eq(song_id))
            .count(db)
            .await?;

        Ok(TransferPreview {
            affected: TransferAffectedCounts {
                staff_playlists: staff_playlists_count,
                staff_playlist_archives: staff_archives_count,
                radio_playlists: radio_playlists_count,
                radio_playlist_archives: radio_archives_count,
                radio_raw_datas: radio_raw_count,
                song_aliases: song_aliases_count,
                songs: 1,
                ..Default::default()
            },
            stats_recalc_album_ids: vec![],
            stats_recalc_song_ids: vec![song_id],
        })
    }

    /// Transfer a song to a different band
    ///
    /// Updates songs.band_id, playlist tables, aliases, and triggers stats recalculation.
    pub async fn transfer_song_to_band(
        db: &DatabaseConnection,
        song_id: u32,
        target_band_id: u32,
        user_id: Option<u32>,
        ip_address: Option<String>,
    ) -> Result<TransferResult, DbErr> {
        // Verify song and band exist
        let song = songs::Entity::find_by_id(song_id)
            .one(db)
            .await?
            .ok_or_else(|| DbErr::RecordNotFound(format!("Song {} not found", song_id)))?;

        let target_band = bands::Entity::find_by_id(target_band_id)
            .one(db)
            .await?
            .ok_or_else(|| DbErr::RecordNotFound(format!("Band {} not found", target_band_id)))?;

        let source_band_id = song.band_id;

        let txn = db.begin().await?;
        let mut affected = TransferAffectedCounts::default();

        // 1. Update songs.band_id
        songs::Entity::update_many()
            .filter(songs::Column::Id.eq(song_id))
            .col_expr(songs::Column::BandId, Expr::value(target_band_id))
            .exec(&txn)
            .await?;
        affected.songs = 1;

        // 2. Update staff_playlists
        let staff_update = staff_playlists::Entity::update_many()
            .filter(staff_playlists::Column::SongId.eq(song_id))
            .col_expr(staff_playlists::Column::BandId, Expr::value(target_band_id))
            .exec(&txn)
            .await?;
        affected.staff_playlists = staff_update.rows_affected;

        // 3. Update staff_playlist_archives
        let staff_archive_update = staff_playlist_archives::Entity::update_many()
            .filter(staff_playlist_archives::Column::SongId.eq(song_id))
            .col_expr(staff_playlist_archives::Column::BandId, Expr::value(target_band_id))
            .exec(&txn)
            .await?;
        affected.staff_playlist_archives = staff_archive_update.rows_affected;

        // 4. Update radio_playlists
        let radio_update = radio_playlists::Entity::update_many()
            .filter(radio_playlists::Column::SongId.eq(song_id))
            .col_expr(radio_playlists::Column::BandId, Expr::value(target_band_id))
            .exec(&txn)
            .await?;
        affected.radio_playlists = radio_update.rows_affected;

        // 5. Update radio_playlist_archives
        let radio_archive_update = radio_playlist_archives::Entity::update_many()
            .filter(radio_playlist_archives::Column::SongId.eq(song_id))
            .col_expr(radio_playlist_archives::Column::BandId, Expr::value(target_band_id))
            .exec(&txn)
            .await?;
        affected.radio_playlist_archives = radio_archive_update.rows_affected;

        // 6. Update radio_raw_datas
        let raw_update = radio_raw_datas::Entity::update_many()
            .filter(radio_raw_datas::Column::SongId.eq(song_id))
            .col_expr(radio_raw_datas::Column::BandId, Expr::value(target_band_id))
            .exec(&txn)
            .await?;
        affected.radio_raw_datas = raw_update.rows_affected;

        // 7. Update song_aliases
        let alias_update = song_aliases::Entity::update_many()
            .filter(song_aliases::Column::SongId.eq(song_id))
            .col_expr(song_aliases::Column::BandId, Expr::value(target_band_id))
            .exec(&txn)
            .await?;
        affected.song_aliases = alias_update.rows_affected;

        // 8. Mark source band as needs_review (if it exists)
        if let Some(band_id) = source_band_id {
            bands::Entity::update_many()
                .filter(bands::Column::Id.eq(band_id))
                .col_expr(bands::Column::DataStatus, Expr::value("needs_review"))
                .col_expr(bands::Column::DataStatusReason, Expr::value("transfer"))
                .col_expr(bands::Column::DataStatusAt, Expr::value(Utc::now().naive_utc()))
                .col_expr(bands::Column::DataStatusBy, Expr::value(user_id))
                .exec(&txn)
                .await?;
        }

        // 9. Mark target band as needs_review
        bands::Entity::update_many()
            .filter(bands::Column::Id.eq(target_band_id))
            .col_expr(bands::Column::DataStatus, Expr::value("needs_review"))
            .col_expr(bands::Column::DataStatusReason, Expr::value("transfer"))
            .col_expr(bands::Column::DataStatusAt, Expr::value(Utc::now().naive_utc()))
            .col_expr(bands::Column::DataStatusBy, Expr::value(user_id))
            .exec(&txn)
            .await?;

        txn.commit().await?;

        // Log the action
        let metadata = serde_json::json!({
            "source_band_id": source_band_id,
            "target_band_id": target_band_id,
            "affected": affected,
        });

        ActionLogService::record(
            db,
            action_types::SONG_TRANSFER_BAND,
            entity_types::SONG,
            song_id,
            user_id,
            Some(serde_json::json!({ "band_id": source_band_id })),
            Some(serde_json::json!({ "band_id": target_band_id })),
            Some(metadata),
            ip_address,
        )
        .await?;

        // TODO: Trigger stats recalculation

        Ok(TransferResult {
            success: true,
            affected,
            message: format!(
                "Song '{}' transferred to band '{}'",
                song.name.unwrap_or_default(),
                target_band.name
            ),
        })
    }

    /// Remove a song from an album (for compilations)
    ///
    /// Only removes the albums_songs junction row, does not delete the song.
    pub async fn remove_song_from_album(
        db: &DatabaseConnection,
        song_id: u32,
        album_id: u32,
        user_id: Option<u32>,
        ip_address: Option<String>,
    ) -> Result<TransferResult, DbErr> {
        // Verify the association exists
        let association = albums_songs::Entity::find()
            .filter(albums_songs::Column::SongId.eq(song_id))
            .filter(albums_songs::Column::AlbumId.eq(album_id))
            .one(db)
            .await?
            .ok_or_else(|| DbErr::RecordNotFound("Song is not on this album".to_string()))?;

        let txn = db.begin().await?;

        // Delete the junction row
        let delete_result = albums_songs::Entity::delete_by_id(association.id)
            .exec(&txn)
            .await?;

        // Mark album as needs_review
        albums::Entity::update_many()
            .filter(albums::Column::Id.eq(album_id))
            .col_expr(albums::Column::DataStatus, Expr::value("needs_review"))
            .col_expr(albums::Column::DataStatusReason, Expr::value("transfer"))
            .col_expr(albums::Column::DataStatusAt, Expr::value(Utc::now().naive_utc()))
            .col_expr(albums::Column::DataStatusBy, Expr::value(user_id))
            .exec(&txn)
            .await?;

        txn.commit().await?;

        // Log the action
        ActionLogService::record(
            db,
            action_types::SONG_REMOVE_FROM_ALBUM,
            entity_types::SONG,
            song_id,
            user_id,
            Some(serde_json::json!({ "album_id": album_id })),
            None,
            Some(serde_json::json!({ "removed_from_album_id": album_id })),
            ip_address,
        )
        .await?;

        // TODO: Trigger stats recalculation for the album

        Ok(TransferResult {
            success: true,
            affected: TransferAffectedCounts {
                albums_songs: delete_result.rows_affected,
                ..Default::default()
            },
            message: "Song removed from album".to_string(),
        })
    }

    /// Preview the impact of transferring an album to a different band
    pub async fn preview_album_transfer_band(
        db: &DatabaseConnection,
        album_id: u32,
        _target_band_id: u32,
        transfer_songs: bool,
    ) -> Result<TransferPreview, DbErr> {
        let mut affected = TransferAffectedCounts::default();
        let mut stats_song_ids = Vec::new();

        // Count albums_bands
        affected.albums_bands = albums_bands::Entity::find()
            .filter(albums_bands::Column::AlbumId.eq(album_id))
            .count(db)
            .await?;

        // Count playlist entries for the album
        affected.staff_playlists = staff_playlists::Entity::find()
            .filter(staff_playlists::Column::AlbumId.eq(album_id))
            .count(db)
            .await?;

        affected.staff_playlist_archives = staff_playlist_archives::Entity::find()
            .filter(staff_playlist_archives::Column::AlbumId.eq(album_id))
            .count(db)
            .await?;

        affected.radio_playlists = radio_playlists::Entity::find()
            .filter(radio_playlists::Column::AlbumId.eq(album_id))
            .count(db)
            .await?;

        affected.radio_playlist_archives = radio_playlist_archives::Entity::find()
            .filter(radio_playlist_archives::Column::AlbumId.eq(album_id))
            .count(db)
            .await?;

        // If transferring songs too, count those
        if transfer_songs {
            let songs_on_album: Vec<albums_songs::Model> = albums_songs::Entity::find()
                .filter(albums_songs::Column::AlbumId.eq(album_id))
                .all(db)
                .await?;

            affected.songs = songs_on_album.len() as u64;
            stats_song_ids = songs_on_album.iter().map(|s| s.song_id).collect();

            // Count aliases for songs (batch)
            let song_ids: Vec<u32> = songs_on_album.iter().map(|s| s.song_id).collect();
            if !song_ids.is_empty() {
                affected.song_aliases = song_aliases::Entity::find()
                    .filter(song_aliases::Column::SongId.is_in(song_ids))
                    .count(db)
                    .await?;
            }
        }

        Ok(TransferPreview {
            affected,
            stats_recalc_album_ids: vec![album_id],
            stats_recalc_song_ids: stats_song_ids,
        })
    }

    /// Transfer an album to a different band
    ///
    /// Optionally transfers all songs on the album to the same band.
    pub async fn transfer_album_to_band(
        db: &DatabaseConnection,
        album_id: u32,
        target_band_id: u32,
        transfer_songs: bool,
        user_id: Option<u32>,
        ip_address: Option<String>,
    ) -> Result<TransferResult, DbErr> {
        // Verify album and band exist
        let album = albums::Entity::find_by_id(album_id)
            .one(db)
            .await?
            .ok_or_else(|| DbErr::RecordNotFound(format!("Album {} not found", album_id)))?;

        let target_band = bands::Entity::find_by_id(target_band_id)
            .one(db)
            .await?
            .ok_or_else(|| DbErr::RecordNotFound(format!("Band {} not found", target_band_id)))?;

        // Get current band associations
        let current_bands: Vec<albums_bands::Model> = albums_bands::Entity::find()
            .filter(albums_bands::Column::AlbumId.eq(album_id))
            .all(db)
            .await?;

        let source_band_ids: Vec<u32> = current_bands.iter().filter_map(|b| b.band_id).collect();

        let txn = db.begin().await?;
        let mut affected = TransferAffectedCounts::default();

        // 1. Delete old albums_bands entries
        let delete_result = albums_bands::Entity::delete_many()
            .filter(albums_bands::Column::AlbumId.eq(album_id))
            .exec(&txn)
            .await?;
        affected.albums_bands = delete_result.rows_affected;

        // 2. Create new albums_bands entry
        let new_album_band = albums_bands::ActiveModel {
            album_id: Set(Some(album_id)),
            band_id: Set(Some(target_band_id)),
            ..Default::default()
        };
        new_album_band.insert(&txn).await?;

        // 3. Update staff_playlists for album
        let staff_update = staff_playlists::Entity::update_many()
            .filter(staff_playlists::Column::AlbumId.eq(album_id))
            .col_expr(staff_playlists::Column::BandId, Expr::value(target_band_id))
            .exec(&txn)
            .await?;
        affected.staff_playlists = staff_update.rows_affected;

        // 4. Update staff_playlist_archives for album
        let staff_archive_update = staff_playlist_archives::Entity::update_many()
            .filter(staff_playlist_archives::Column::AlbumId.eq(album_id))
            .col_expr(staff_playlist_archives::Column::BandId, Expr::value(target_band_id))
            .exec(&txn)
            .await?;
        affected.staff_playlist_archives = staff_archive_update.rows_affected;

        // 5. Update radio_playlists for album
        let radio_update = radio_playlists::Entity::update_many()
            .filter(radio_playlists::Column::AlbumId.eq(album_id))
            .col_expr(radio_playlists::Column::BandId, Expr::value(target_band_id))
            .exec(&txn)
            .await?;
        affected.radio_playlists = radio_update.rows_affected;

        // 6. Update radio_playlist_archives for album
        let radio_archive_update = radio_playlist_archives::Entity::update_many()
            .filter(radio_playlist_archives::Column::AlbumId.eq(album_id))
            .col_expr(radio_playlist_archives::Column::BandId, Expr::value(target_band_id))
            .exec(&txn)
            .await?;
        affected.radio_playlist_archives = radio_archive_update.rows_affected;

        // 7. If transferring songs, update all songs on this album
        if transfer_songs {
            let songs_on_album: Vec<albums_songs::Model> = albums_songs::Entity::find()
                .filter(albums_songs::Column::AlbumId.eq(album_id))
                .all(&txn)
                .await?;

            let song_ids: Vec<u32> = songs_on_album.iter().map(|s| s.song_id).collect();

            if !song_ids.is_empty() {
                // Batch update songs.band_id
                songs::Entity::update_many()
                    .filter(songs::Column::Id.is_in(song_ids.clone()))
                    .col_expr(songs::Column::BandId, Expr::value(target_band_id))
                    .exec(&txn)
                    .await?;

                // Batch update song aliases
                let alias_result = song_aliases::Entity::update_many()
                    .filter(song_aliases::Column::SongId.is_in(song_ids.clone()))
                    .col_expr(song_aliases::Column::BandId, Expr::value(target_band_id))
                    .exec(&txn)
                    .await?;
                affected.song_aliases = alias_result.rows_affected;

                // Batch update radio_raw_datas for songs
                let raw_result = radio_raw_datas::Entity::update_many()
                    .filter(radio_raw_datas::Column::SongId.is_in(song_ids))
                    .col_expr(radio_raw_datas::Column::BandId, Expr::value(target_band_id))
                    .exec(&txn)
                    .await?;
                affected.radio_raw_datas = raw_result.rows_affected;
            }

            affected.songs = songs_on_album.len() as u64;
        }

        // 8. Mark source bands as needs_review
        if !source_band_ids.is_empty() {
            bands::Entity::update_many()
                .filter(bands::Column::Id.is_in(source_band_ids.clone()))
                .col_expr(bands::Column::DataStatus, Expr::value("needs_review"))
                .col_expr(bands::Column::DataStatusReason, Expr::value("transfer"))
                .col_expr(bands::Column::DataStatusAt, Expr::value(Utc::now().naive_utc()))
                .col_expr(bands::Column::DataStatusBy, Expr::value(user_id))
                .exec(&txn)
                .await?;
        }

        // 9. Mark target band as needs_review
        bands::Entity::update_many()
            .filter(bands::Column::Id.eq(target_band_id))
            .col_expr(bands::Column::DataStatus, Expr::value("needs_review"))
            .col_expr(bands::Column::DataStatusReason, Expr::value("transfer"))
            .col_expr(bands::Column::DataStatusAt, Expr::value(Utc::now().naive_utc()))
            .col_expr(bands::Column::DataStatusBy, Expr::value(user_id))
            .exec(&txn)
            .await?;

        // 10. Mark album as needs_review
        albums::Entity::update_many()
            .filter(albums::Column::Id.eq(album_id))
            .col_expr(albums::Column::DataStatus, Expr::value("needs_review"))
            .col_expr(albums::Column::DataStatusReason, Expr::value("transfer"))
            .col_expr(albums::Column::DataStatusAt, Expr::value(Utc::now().naive_utc()))
            .col_expr(albums::Column::DataStatusBy, Expr::value(user_id))
            .exec(&txn)
            .await?;

        txn.commit().await?;

        // Log the action
        let metadata = serde_json::json!({
            "source_band_ids": source_band_ids,
            "target_band_id": target_band_id,
            "transfer_songs": transfer_songs,
            "affected": affected,
        });

        ActionLogService::record(
            db,
            action_types::ALBUM_TRANSFER_BAND,
            entity_types::ALBUM,
            album_id,
            user_id,
            Some(serde_json::json!({ "band_ids": source_band_ids })),
            Some(serde_json::json!({ "band_id": target_band_id })),
            Some(metadata),
            ip_address,
        )
        .await?;

        // TODO: Trigger stats recalculation

        Ok(TransferResult {
            success: true,
            affected,
            message: format!(
                "Album '{}' transferred to band '{}'{}",
                album.name.unwrap_or_default(),
                target_band.name,
                if transfer_songs { " (with songs)" } else { "" }
            ),
        })
    }
}
