//! Album merge operations.

use crate::models::albums::{Entity as Album, ActiveModel as AlbumActiveModel};
use crate::models::album_images::{Entity as AlbumImage, Column as AlbumImageColumn};
use crate::models::albums_bands::{Entity as AlbumsBands, Column as AlbumsBandsColumn};
use crate::models::albums_songs::{Entity as AlbumSong, Column as AlbumSongColumn};
use crate::models::albums_sub_genres::{Entity as AlbumSubGenre, Column as AlbumSubGenreColumn, ActiveModel as AlbumSubGenreActiveModel};
use crate::models::radio_playlists::{Entity as RadioPlaylist, Column as RadioPlaylistColumn};
use crate::models::radio_playlist_archives::{Entity as RadioPlaylistArchive, Column as RadioPlaylistArchiveColumn};
use crate::models::staff_playlists::{Entity as StaffPlaylist, Column as StaffPlaylistColumn};
use crate::models::staff_playlist_archives::{Entity as StaffPlaylistArchive, Column as StaffPlaylistArchiveColumn};
use crate::models::album_rankings::{Entity as AlbumRanking, Column as AlbumRankingColumn};
use crate::models::album_total_stats::{Entity as AlbumTotalStats, Column as AlbumTotalStatsColumn};
use crate::models::album_weekly_stats::{Entity as AlbumWeeklyStats, Column as AlbumWeeklyStatsColumn};
use crate::models::album_aliases::{Entity as AlbumAlias, Column as AlbumAliasColumn};
use crate::models::album_duplicate_candidates::{Entity as AlbumDuplicateCandidate, Column as AlbumDuplicateCandidateColumn};
use crate::services::action_log_service::ActionLogService;
use super::types::{MergeAlbumsRequest, AlbumMergeResult, AlbumMergeStats};
use chrono::NaiveDate;
use sea_orm::*;
use sea_orm::sea_query::Expr;
use std::collections::{HashMap, HashSet};

// Type aliases for complex HashMap types used in playlist aggregation
type PlaylistKey = (Option<u32>, Option<u32>, Option<u32>);
type PlaylistValue = (u32, i32, i32);
type ArchiveKey = (Option<u32>, Option<u32>, Option<u32>, Option<NaiveDate>);
type ArchiveValue = (u32, i32, i32);
type StaffPlaylistValue = (u32, Option<i32>);

/// Merge multiple albums into a target album.
pub async fn merge_albums(
    db: &DatabaseConnection,
    req: MergeAlbumsRequest,
    user_id: Option<u32>,
    ip_address: Option<String>,
) -> Result<AlbumMergeResult, DbErr> {
    // Validate target album exists
    let into_album = Album::find_by_id(req.into_id).one(db).await?;
    if into_album.is_none() {
        return Err(DbErr::RecordNotFound("Target album not found".to_string()));
    }

    // Capture before-state for audit logging
    let before_state = serde_json::json!({
        "target_id": req.into_id,
        "source_ids": &req.from_ids,
    });
    let from_ids_for_log = req.from_ids.clone();
    let target_id_for_log = req.into_id;

    // Perform merge in a transaction
    let result = db.transaction::<_, AlbumMergeResult, DbErr>(|txn| {
        Box::pin(async move {
            let mut stats = AlbumMergeStats::default();

            let target_id = req.into_id;
            let from_ids = req.from_ids.clone();

            // 1. Update target album with merged data fields
            if let Some(obj) = req.merged_data.as_object() {
                let album = Album::find_by_id(target_id).one(txn).await?
                    .ok_or(DbErr::RecordNotFound("Target album not found".to_string()))?;

                let mut active_model: AlbumActiveModel = album.into();

                if let Some(name) = obj.get("name").and_then(|v| v.as_str()) {
                    active_model.name = Set(Some(name.to_string()));
                }
                if let Some(slug) = obj.get("slug").and_then(|v| v.as_str()) {
                    active_model.slug = Set(Some(slug.to_string()));
                }
                if let Some(release_date_str) = obj.get("release_date").and_then(|v| v.as_str())
                    && let Ok(date) = NaiveDate::parse_from_str(release_date_str, "%Y-%m-%d") {
                        active_model.release_date = Set(Some(date));
                    }
                if let Some(label_id) = obj.get("label_id").and_then(|v| v.as_u64()) {
                    active_model.label_id = Set(Some(label_id as u32));
                }
                if let Some(sub_genre_for_charting) = obj.get("sub_genre_for_charting").and_then(|v| v.as_u64()) {
                    active_model.sub_genre_for_charting = Set(Some(sub_genre_for_charting as u32));
                }
                if let Some(img) = obj.get("img").and_then(|v| v.as_str()) {
                    active_model.img = Set(Some(img.to_string()));
                }
                if let Some(about) = obj.get("about").and_then(|v| v.as_str()) {
                    active_model.about = Set(Some(about.to_string()));
                }
                if let Some(thanks) = obj.get("thanks").and_then(|v| v.as_str()) {
                    active_model.thanks = Set(Some(thanks.to_string()));
                }
                if let Some(producer) = obj.get("producer").and_then(|v| v.as_str()) {
                    active_model.producer = Set(Some(producer.to_string()));
                }
                if let Some(engineer) = obj.get("engineer").and_then(|v| v.as_str()) {
                    active_model.engineer = Set(Some(engineer.to_string()));
                }
                if let Some(studio) = obj.get("studio").and_then(|v| v.as_str()) {
                    active_model.studio = Set(Some(studio.to_string()));
                }
                if let Some(master) = obj.get("master").and_then(|v| v.as_str()) {
                    active_model.master = Set(Some(master.to_string()));
                }
                if let Some(itunes_url) = obj.get("itunes_url").and_then(|v| v.as_str()) {
                    active_model.itunes_url = Set(Some(itunes_url.to_string()));
                }
                if let Some(cdbaby_url) = obj.get("cdbaby_url").and_then(|v| v.as_str()) {
                    active_model.cdbaby_url = Set(Some(cdbaby_url.to_string()));
                }
                if let Some(amazon_url) = obj.get("amazon_url").and_then(|v| v.as_str()) {
                    active_model.amazon_url = Set(Some(amazon_url.to_string()));
                }
                if let Some(itunes_id) = obj.get("itunes_id").and_then(|v| v.as_u64()) {
                    active_model.itunes_id = Set(Some(itunes_id as u32));
                }
                if let Some(rovi_id) = obj.get("rovi_id").and_then(|v| v.as_str()) {
                    active_model.rovi_id = Set(Some(rovi_id.to_string()));
                }
                if let Some(compilation) = obj.get("compilation").and_then(|v| v.as_i64()) {
                    active_model.compilation = Set(compilation as i8);
                }
                if let Some(soundtrack) = obj.get("soundtrack").and_then(|v| v.as_i64()) {
                    active_model.soundtrack = Set(soundtrack as i8);
                }

                active_model.update(txn).await?;
            }

            // 2. Move album images (dedupe by path)
            let existing_paths: HashSet<String> = AlbumImage::find()
                .filter(AlbumImageColumn::AlbumId.eq(target_id))
                .all(txn)
                .await?
                .into_iter()
                .filter_map(|img| img.path)
                .collect();

            let images = AlbumImage::find()
                .filter(AlbumImageColumn::AlbumId.is_in(from_ids.clone()))
                .all(txn)
                .await?;

            for img in images {
                if let Some(ref path) = img.path
                    && existing_paths.contains(path) {
                        stats.images_deduped += 1;
                        continue;
                    }
                let mut active: crate::models::album_images::ActiveModel = img.into();
                active.album_id = Set(Some(target_id));
                active.update(txn).await?;
                stats.images_moved += 1;
            }

            // 3. Move albums_bands associations (dedupe by band_id)
            let existing_band_ids: HashSet<u32> = AlbumsBands::find()
                .filter(AlbumsBandsColumn::AlbumId.eq(target_id))
                .all(txn)
                .await?
                .into_iter()
                .filter_map(|ab| ab.band_id)
                .collect();

            let album_bands = AlbumsBands::find()
                .filter(AlbumsBandsColumn::AlbumId.is_in(from_ids.clone()))
                .all(txn)
                .await?;

            for ab in album_bands {
                if let Some(band_id) = ab.band_id
                    && existing_band_ids.contains(&band_id) {
                        let active: crate::models::albums_bands::ActiveModel = ab.into();
                        active.delete(txn).await?;
                        stats.band_associations_deduped += 1;
                        continue;
                    }
                let mut active: crate::models::albums_bands::ActiveModel = ab.into();
                active.album_id = Set(Some(target_id));
                active.update(txn).await?;
                stats.band_associations_moved += 1;
            }

            // 4. Move albums_songs associations (dedupe by song_id)
            let existing_song_ids: HashSet<u32> = AlbumSong::find()
                .filter(AlbumSongColumn::AlbumId.eq(target_id))
                .all(txn)
                .await?
                .into_iter()
                .map(|as_| as_.song_id)
                .collect();

            let album_songs = AlbumSong::find()
                .filter(AlbumSongColumn::AlbumId.is_in(from_ids.clone()))
                .all(txn)
                .await?;

            for as_ in album_songs {
                if existing_song_ids.contains(&as_.song_id) {
                    let active: crate::models::albums_songs::ActiveModel = as_.into();
                    active.delete(txn).await?;
                    stats.song_associations_deduped += 1;
                    continue;
                }
                let mut active: crate::models::albums_songs::ActiveModel = as_.into();
                active.album_id = Set(target_id);
                active.update(txn).await?;
                stats.song_associations_moved += 1;
            }

            // 5. Merge albums_sub_genres associations (dedupe by sub_genre_id)
            let existing_sub_genre_ids: HashSet<u32> = AlbumSubGenre::find()
                .filter(AlbumSubGenreColumn::AlbumId.eq(target_id))
                .all(txn)
                .await?
                .into_iter()
                .filter_map(|asg| asg.sub_genre_id)
                .collect();

            let album_sub_genres = AlbumSubGenre::find()
                .filter(AlbumSubGenreColumn::AlbumId.is_in(from_ids.clone()))
                .all(txn)
                .await?;

            for asg in album_sub_genres {
                if let Some(sg_id) = asg.sub_genre_id
                    && existing_sub_genre_ids.contains(&sg_id) {
                        let active: AlbumSubGenreActiveModel = asg.into();
                        active.delete(txn).await?;
                        continue;
                    }
                let mut active: AlbumSubGenreActiveModel = asg.into();
                active.album_id = Set(Some(target_id));
                active.update(txn).await?;
                stats.sub_genres_added += 1;
            }

            // 6. Radio playlists — aggregate spins on composite key match
            {
                let target_playlists = RadioPlaylist::find()
                    .filter(RadioPlaylistColumn::AlbumId.eq(target_id))
                    .all(txn)
                    .await?;

                let mut target_map: HashMap<PlaylistKey, PlaylistValue> = HashMap::new();
                for pl in &target_playlists {
                    target_map.insert(
                        (pl.radio_station_id, pl.band_id, pl.song_id),
                        (pl.id, pl.spins, pl.subtract_spins),
                    );
                }

                let playlists = RadioPlaylist::find()
                    .filter(RadioPlaylistColumn::AlbumId.is_in(from_ids.clone()))
                    .all(txn)
                    .await?;

                for pl in playlists {
                    let key = (pl.radio_station_id, pl.band_id, pl.song_id);
                    if let Some(&(target_pl_id, target_spins, target_sub_spins)) = target_map.get(&key) {
                        RadioPlaylist::update_many()
                            .filter(RadioPlaylistColumn::Id.eq(target_pl_id))
                            .col_expr(RadioPlaylistColumn::Spins, Expr::value(target_spins + pl.spins))
                            .col_expr(RadioPlaylistColumn::SubtractSpins, Expr::value(target_sub_spins + pl.subtract_spins))
                            .exec(txn).await?;

                        let source_active: crate::models::radio_playlists::ActiveModel = pl.into();
                        source_active.delete(txn).await?;
                        stats.radio_playlists_aggregated += 1;
                    } else {
                        let mut active: crate::models::radio_playlists::ActiveModel = pl.into();
                        active.album_id = Set(Some(target_id));
                        active.update(txn).await?;
                        stats.radio_playlists_moved += 1;
                    }
                }
            }

            // 7. Radio playlist archives — aggregate spins on composite key match
            {
                let target_archives = RadioPlaylistArchive::find()
                    .filter(RadioPlaylistArchiveColumn::AlbumId.eq(target_id))
                    .all(txn)
                    .await?;

                let mut target_map: HashMap<ArchiveKey, ArchiveValue> = HashMap::new();
                for arch in &target_archives {
                    target_map.insert(
                        (arch.radio_station_id, arch.band_id, arch.song_id, arch.week_ending),
                        (arch.id, arch.spins, arch.subtract_spins),
                    );
                }

                let archives = RadioPlaylistArchive::find()
                    .filter(RadioPlaylistArchiveColumn::AlbumId.is_in(from_ids.clone()))
                    .all(txn)
                    .await?;

                for arch in archives {
                    let key = (arch.radio_station_id, arch.band_id, arch.song_id, arch.week_ending);
                    if let Some(&(target_arch_id, target_spins, target_sub_spins)) = target_map.get(&key) {
                        RadioPlaylistArchive::update_many()
                            .filter(RadioPlaylistArchiveColumn::Id.eq(target_arch_id))
                            .col_expr(RadioPlaylistArchiveColumn::Spins, Expr::value(target_spins + arch.spins))
                            .col_expr(RadioPlaylistArchiveColumn::SubtractSpins, Expr::value(target_sub_spins + arch.subtract_spins))
                            .exec(txn).await?;

                        let source_active: crate::models::radio_playlist_archives::ActiveModel = arch.into();
                        source_active.delete(txn).await?;
                        stats.radio_playlist_archives_aggregated += 1;
                    } else {
                        let mut active: crate::models::radio_playlist_archives::ActiveModel = arch.into();
                        active.album_id = Set(Some(target_id));
                        active.update(txn).await?;
                        stats.radio_playlist_archives_moved += 1;
                    }
                }
            }

            // 8. Staff playlists — aggregate spins on composite key match
            {
                let target_playlists = StaffPlaylist::find()
                    .filter(StaffPlaylistColumn::AlbumId.eq(target_id))
                    .all(txn)
                    .await?;

                let mut target_map: HashMap<PlaylistKey, StaffPlaylistValue> = HashMap::new();
                for pl in &target_playlists {
                    target_map.insert(
                        (pl.staff_member_id, pl.band_id, pl.song_id),
                        (pl.id, pl.spins),
                    );
                }

                let playlists = StaffPlaylist::find()
                    .filter(StaffPlaylistColumn::AlbumId.is_in(from_ids.clone()))
                    .all(txn)
                    .await?;

                for pl in playlists {
                    let key = (pl.staff_member_id, pl.band_id, pl.song_id);
                    if let Some(&(target_pl_id, target_spins)) = target_map.get(&key) {
                        StaffPlaylist::update_many()
                            .filter(StaffPlaylistColumn::Id.eq(target_pl_id))
                            .col_expr(StaffPlaylistColumn::Spins, Expr::value(Some(target_spins.unwrap_or(0) + pl.spins.unwrap_or(0))))
                            .exec(txn).await?;

                        let source_active: crate::models::staff_playlists::ActiveModel = pl.into();
                        source_active.delete(txn).await?;
                        stats.staff_playlists_aggregated += 1;
                    } else {
                        let mut active: crate::models::staff_playlists::ActiveModel = pl.into();
                        active.album_id = Set(Some(target_id));
                        active.update(txn).await?;
                        stats.staff_playlists_moved += 1;
                    }
                }
            }

            // 9. Staff playlist archives — aggregate spins on composite key match
            {
                let target_archives = StaffPlaylistArchive::find()
                    .filter(StaffPlaylistArchiveColumn::AlbumId.eq(target_id))
                    .all(txn)
                    .await?;

                let mut target_map: HashMap<ArchiveKey, StaffPlaylistValue> = HashMap::new();
                for arch in &target_archives {
                    target_map.insert(
                        (arch.staff_member_id, arch.band_id, arch.song_id, arch.week_ending),
                        (arch.id, arch.spins),
                    );
                }

                let archives = StaffPlaylistArchive::find()
                    .filter(StaffPlaylistArchiveColumn::AlbumId.is_in(from_ids.clone()))
                    .all(txn)
                    .await?;

                for arch in archives {
                    let key = (arch.staff_member_id, arch.band_id, arch.song_id, arch.week_ending);
                    if let Some(&(target_arch_id, target_spins)) = target_map.get(&key) {
                        StaffPlaylistArchive::update_many()
                            .filter(StaffPlaylistArchiveColumn::Id.eq(target_arch_id))
                            .col_expr(StaffPlaylistArchiveColumn::Spins, Expr::value(Some(target_spins.unwrap_or(0) + arch.spins.unwrap_or(0))))
                            .exec(txn).await?;

                        let source_active: crate::models::staff_playlist_archives::ActiveModel = arch.into();
                        source_active.delete(txn).await?;
                        stats.staff_playlist_archives_aggregated += 1;
                    } else {
                        let mut active: crate::models::staff_playlist_archives::ActiveModel = arch.into();
                        active.album_id = Set(Some(target_id));
                        active.update(txn).await?;
                        stats.staff_playlist_archives_moved += 1;
                    }
                }
            }

            // 10. (Skipped — radio_raw_datas has no album_id column)

            // 11. Move album rankings (move all)
            let rankings = AlbumRanking::find()
                .filter(AlbumRankingColumn::AlbumId.is_in(from_ids.clone()))
                .all(txn)
                .await?;

            for ranking in rankings {
                let mut active: crate::models::album_rankings::ActiveModel = ranking.into();
                active.album_id = Set(Some(target_id));
                active.update(txn).await?;
                stats.rankings_moved += 1;
            }

            // 12. Move album total stats (move all)
            let total_stats = AlbumTotalStats::find()
                .filter(AlbumTotalStatsColumn::AlbumId.is_in(from_ids.clone()))
                .all(txn)
                .await?;

            for ts in total_stats {
                let mut active: crate::models::album_total_stats::ActiveModel = ts.into();
                active.album_id = Set(Some(target_id));
                active.update(txn).await?;
                stats.total_stats_moved += 1;
            }

            // 13. Move album weekly stats (move all)
            let weekly_stats = AlbumWeeklyStats::find()
                .filter(AlbumWeeklyStatsColumn::AlbumId.is_in(from_ids.clone()))
                .all(txn)
                .await?;

            for ws in weekly_stats {
                let mut active: crate::models::album_weekly_stats::ActiveModel = ws.into();
                active.album_id = Set(Some(target_id));
                active.update(txn).await?;
                stats.weekly_stats_moved += 1;
            }

            // 14. Album aliases — dedupe on (band_id, radio_station_id, alias_key)
            {
                let target_aliases = AlbumAlias::find()
                    .filter(AlbumAliasColumn::AlbumId.eq(target_id))
                    .all(txn)
                    .await?;

                let mut existing_alias_keys: HashSet<(u32, Option<u32>, String)> = target_aliases
                    .into_iter()
                    .map(|a| (a.band_id, a.radio_station_id, a.alias_key))
                    .collect();

                let aliases = AlbumAlias::find()
                    .filter(AlbumAliasColumn::AlbumId.is_in(from_ids.clone()))
                    .all(txn)
                    .await?;

                for alias in aliases {
                    let key = (alias.band_id, alias.radio_station_id, alias.alias_key.clone());
                    if existing_alias_keys.contains(&key) {
                        let active: crate::models::album_aliases::ActiveModel = alias.into();
                        active.delete(txn).await?;
                        stats.aliases_deduped += 1;
                    } else {
                        let mut active: crate::models::album_aliases::ActiveModel = alias.into();
                        active.album_id = Set(target_id);
                        active.update(txn).await?;
                        existing_alias_keys.insert(key);
                        stats.aliases_moved += 1;
                    }
                }
            }

            // 15-17. Album duplicate candidates — reassign, remove self-refs, deduplicate pairs
            {
                // Reassign album_id_1 references
                let candidates_1 = AlbumDuplicateCandidate::find()
                    .filter(AlbumDuplicateCandidateColumn::AlbumId1.is_in(from_ids.clone()))
                    .all(txn)
                    .await?;

                for cand in candidates_1 {
                    let mut active: crate::models::album_duplicate_candidates::ActiveModel = cand.into();
                    active.album_id_1 = Set(target_id);
                    active.update(txn).await?;
                    stats.duplicate_candidates_updated += 1;
                }

                // Reassign album_id_2 references
                let candidates_2 = AlbumDuplicateCandidate::find()
                    .filter(AlbumDuplicateCandidateColumn::AlbumId2.is_in(from_ids.clone()))
                    .all(txn)
                    .await?;

                for cand in candidates_2 {
                    let mut active: crate::models::album_duplicate_candidates::ActiveModel = cand.into();
                    active.album_id_2 = Set(target_id);
                    active.update(txn).await?;
                    stats.duplicate_candidates_updated += 1;
                }

                // Remove self-referencing rows (album_id_1 == album_id_2 == target_id)
                let self_refs = AlbumDuplicateCandidate::find()
                    .filter(AlbumDuplicateCandidateColumn::AlbumId1.eq(target_id))
                    .filter(AlbumDuplicateCandidateColumn::AlbumId2.eq(target_id))
                    .all(txn)
                    .await?;

                for cand in self_refs {
                    let active: crate::models::album_duplicate_candidates::ActiveModel = cand.into();
                    active.delete(txn).await?;
                    stats.duplicate_candidates_cleaned += 1;
                }

                // Deduplicate pairs: load all candidates involving target, remove duplicate pairs
                let all_target_candidates = AlbumDuplicateCandidate::find()
                    .filter(
                        Condition::any()
                            .add(AlbumDuplicateCandidateColumn::AlbumId1.eq(target_id))
                            .add(AlbumDuplicateCandidateColumn::AlbumId2.eq(target_id))
                    )
                    .all(txn)
                    .await?;

                let mut seen_pairs: HashSet<(u32, u32)> = HashSet::new();
                for cand in all_target_candidates {
                    let pair = (
                        std::cmp::min(cand.album_id_1, cand.album_id_2),
                        std::cmp::max(cand.album_id_1, cand.album_id_2),
                    );
                    if !seen_pairs.insert(pair) {
                        // Duplicate pair — delete
                        let active: crate::models::album_duplicate_candidates::ActiveModel = cand.into();
                        active.delete(txn).await?;
                        stats.duplicate_candidates_cleaned += 1;
                    }
                }
            }

            // 18. Delete source albums
            for from_id in &from_ids {
                Album::delete_by_id(*from_id).exec(txn).await?;
                stats.albums_deleted += 1;
            }

            // 19. Get and return the updated target album
            let merged_album = Album::find_by_id(target_id).one(txn).await?
                .ok_or(DbErr::RecordNotFound("Merged album not found".to_string()))?;

            Ok(AlbumMergeResult {
                merged_album,
                stats,
            })
        })
    }).await.map_err(|e| match e {
        TransactionError::Connection(db_err) => db_err,
        TransactionError::Transaction(db_err) => db_err,
    })?;

    // 20. Audit log (fire-and-forget — don't fail the merge if logging fails)
    let _ = ActionLogService::record_album_merge(
        db,
        target_id_for_log,
        user_id,
        &before_state,
        &result.merged_album,
        &result.stats,
        &from_ids_for_log,
        ip_address,
    ).await;

    Ok(result)
}
