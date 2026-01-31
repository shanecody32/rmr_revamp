use crate::models::songs::{Entity as Song, Model as SongModel, ActiveModel as SongActiveModel};
use sea_orm::*;
use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};
use crate::services::types::{PaginatedResponse, PaginationInfo, SimilarityParams, SimilarResult};
use crate::utils::similarity::find_similar_pipeline;
use crate::models::song_aliases::{Entity as SongAlias, Column as SongAliasColumn};
use crate::models::song_performers::{Entity as SongPerformer, Column as SongPerformerColumn};
use crate::models::albums_songs::{Entity as AlbumsSongs, Column as AlbumsSongsColumn};
use crate::models::radio_playlists::{Entity as RadioPlaylist, Column as RadioPlaylistColumn};
use crate::models::radio_playlist_archives::{Entity as RadioPlaylistArchive, Column as RadioPlaylistArchiveColumn};
use crate::models::staff_playlists::{Entity as StaffPlaylist, Column as StaffPlaylistColumn};
use crate::models::staff_playlist_archives::{Entity as StaffPlaylistArchive, Column as StaffPlaylistArchiveColumn};
use crate::models::radio_raw_datas::{Entity as RadioRawData, Column as RadioRawDataColumn};
use crate::models::song_rankings::{Entity as SongRanking, Column as SongRankingColumn};
use crate::models::song_total_stats::{Entity as SongTotalStats, Column as SongTotalStatsColumn};
use crate::models::song_weekly_stats::{Entity as SongWeeklyStats, Column as SongWeeklyStatsColumn};
use crate::models::temp_song_total_stats::{Entity as TempSongTotalStats, Column as TempSongTotalStatsColumn};
use crate::models::song_duplicate_candidates::{Entity as SongDuplicateCandidate, Column as SongDuplicateCandidateColumn};
use crate::services::action_log_service::ActionLogService;
use std::collections::{HashMap, HashSet};

pub struct SongService;

#[derive(Debug, Deserialize, IntoParams)]
pub struct SongFilterParams {
    pub page: Option<u64>,
    pub page_size: Option<u64>,
    pub name: Option<String>,
    pub name_filter_type: Option<String>,
    pub verified: Option<bool>,
    pub approved: Option<bool>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct MergeSongsRequest {
    pub from_ids: Vec<u32>,
    pub into_id: u32,
    pub merged_data: serde_json::Value,
}

#[derive(Debug, Serialize, ToSchema, Default)]
pub struct SongMergeStats {
    pub performers_moved: u32,
    pub performers_deduped: u32,
    pub album_associations_moved: u32,
    pub album_associations_deduped: u32,
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
    pub songs_deleted: u32,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct SongMergeResult {
    pub merged_song: crate::models::songs::Model,
    pub stats: SongMergeStats,
}

impl SongService {
    pub async fn get_songs(
        db: &DatabaseConnection,
        params: SongFilterParams,
    ) -> Result<PaginatedResponse<SongModel>, DbErr> {
        let page = params.page.unwrap_or(1);
        let page_size = params.page_size.unwrap_or(10);

        let mut query = Song::find();

        if let Some(name) = params.name {
            if !name.is_empty() {
                match params.name_filter_type.as_deref() {
                    Some("starts_with") => {
                        query = query.filter(crate::models::songs::Column::Name.starts_with(&name));
                    }
                    Some("ends_with") => {
                        query = query.filter(crate::models::songs::Column::Name.ends_with(&name));
                    }
                    Some("exact_match") => {
                        query = query.filter(crate::models::songs::Column::Name.eq(&name));
                    }
                    _ => {
                        query = query.filter(crate::models::songs::Column::Name.contains(&name));
                    }
                }
            }
        }

        if let Some(verified) = params.verified {
            query = query.filter(crate::models::songs::Column::Verified.eq(if verified { 1 } else { 0 }));
        }
        if let Some(approved) = params.approved {
            query = query.filter(crate::models::songs::Column::Approved.eq(if approved { 1 } else { 0 }));
        }

        let paginator = query.paginate(db, page_size);
        let total_items = paginator.num_items().await?;
        let total_pages = paginator.num_pages().await?;

        let results = paginator.fetch_page(page - 1).await?;

        Ok(PaginatedResponse {
            results,
            pagination: PaginationInfo {
                page,
                page_size,
                total_pages,
                total_items,
            },
        })
    }

    pub async fn get_song_by_id(db: &DatabaseConnection, id: u32) -> Result<Option<SongModel>, DbErr> {
        Song::find_by_id(id).one(db).await
    }

    pub async fn create_song(db: &DatabaseConnection, data: SongModel) -> Result<SongModel, DbErr> {
        let active_model: SongActiveModel = SongActiveModel {
            name: Set(data.name),
            band_id: Set(data.band_id),
            sub_genre_id: Set(data.sub_genre_id),
            ..Default::default()
        };
        active_model.insert(db).await
    }

    pub async fn update_song(db: &DatabaseConnection, id: u32, data: SongModel) -> Result<SongModel, DbErr> {
        let song = Song::find_by_id(id).one(db).await?;
        if let Some(song) = song {
            let mut active_model: SongActiveModel = song.into();
            active_model.name = Set(data.name);
            active_model.band_id = Set(data.band_id);
            active_model.sub_genre_id = Set(data.sub_genre_id);
            // ... update other fields as needed
            active_model.update(db).await
        } else {
            Err(DbErr::RecordNotFound("Song not found".to_string()))
        }
    }

    pub async fn delete_song(db: &DatabaseConnection, id: u32) -> Result<DeleteResult, DbErr> {
        Song::delete_by_id(id).exec(db).await
    }

    pub async fn get_similar_songs(
        db: &DatabaseConnection,
        params: SimilarityParams,
    ) -> Result<Vec<SimilarResult<SongModel>>, DbErr> {
        let mut query = SongAlias::find();

        if let Some(true) = params.restrict_to_parent {
            if let Some(band_id) = params.band_id {
                query = query.filter(SongAliasColumn::BandId.eq(band_id));
            }
            if let Some(album_id) = params.album_id {
                query = query
                    .join(JoinType::InnerJoin, SongAlias::belongs_to(Song).from(SongAliasColumn::SongId).to(crate::models::songs::Column::Id).into())
                    .join(JoinType::InnerJoin, crate::models::songs::Relation::AlbumsSongs.def())
                    .filter(crate::models::albums_songs::Column::AlbumId.eq(album_id));
            }
        }

        let results: Vec<SimilarResult<crate::models::song_aliases::Model>> = find_similar_pipeline(
            db,
            query,
            crate::utils::similarity::pipeline::SimilarityColumns {
                name: SongAliasColumn::AliasKey,
                slug: SongAliasColumn::Slug,
                sanitized: Some(SongAliasColumn::SanitizedName),
                soundex: Some(SongAliasColumn::SoundexKey),
                phonetic: Some(SongAliasColumn::PhoneticKey),
                metaphone: Some(SongAliasColumn::MetaphoneKey),
                dmetaphone: Some(SongAliasColumn::DmetaphoneKey),
                dmetaphone_alt: Some(SongAliasColumn::DmetaphoneAltKey),
            },
            params,
            SongAliasColumn::SongId,
            |m| m.alias_key.clone(),
        ).await?;

        let mut song_ids: Vec<u32> = results.iter().map(|r| r.model.song_id).collect();
        song_ids.sort();
        song_ids.dedup();

        if song_ids.is_empty() {
            return Ok(vec![]);
        }

        let songs = Song::find()
            .filter(crate::models::songs::Column::Id.is_in(song_ids))
            .all(db)
            .await?;

        let mut final_results = Vec::new();
        for r in results {
            if let Some(song) = songs.iter().find(|s| s.id == r.model.song_id) {
                final_results.push(SimilarResult {
                    model: song.clone(),
                    similarity_score: r.similarity_score,
                });
            }
            if final_results.len() >= 50 { break; }
        }

        let mut seen = std::collections::HashSet::new();
        final_results.retain(|r| seen.insert(r.model.id));

        Ok(final_results)
    }

    pub async fn merge_songs(
        db: &DatabaseConnection,
        req: MergeSongsRequest,
        user_id: Option<u32>,
        ip_address: Option<String>,
    ) -> Result<SongMergeResult, DbErr> {
        // Validate target song exists
        let into_song = Song::find_by_id(req.into_id).one(db).await?;
        if into_song.is_none() {
            return Err(DbErr::RecordNotFound("Target song not found".to_string()));
        }

        // Capture before-state for audit logging
        let before_state = serde_json::json!({
            "target_id": req.into_id,
            "source_ids": &req.from_ids,
        });
        let from_ids_for_log = req.from_ids.clone();
        let target_id_for_log = req.into_id;

        // Perform merge in a transaction
        let result = db.transaction::<_, SongMergeResult, DbErr>(|txn| {
            Box::pin(async move {
                let mut stats = SongMergeStats::default();

                let target_id = req.into_id;
                let from_ids = req.from_ids.clone();

                // 1. Update target song with merged data fields
                if let Some(obj) = req.merged_data.as_object() {
                    let song = Song::find_by_id(target_id).one(txn).await?
                        .ok_or(DbErr::RecordNotFound("Target song not found".to_string()))?;

                    let mut active_model: SongActiveModel = song.into();

                    if let Some(name) = obj.get("name").and_then(|v| v.as_str()) {
                        active_model.name = Set(Some(name.to_string()));
                    }
                    if let Some(slug) = obj.get("slug").and_then(|v| v.as_str()) {
                        active_model.slug = Set(Some(slug.to_string()));
                    }
                    if let Some(band_id) = obj.get("band_id").and_then(|v| v.as_u64()) {
                        active_model.band_id = Set(Some(band_id as u32));
                    }
                    if let Some(sub_genre_id) = obj.get("sub_genre_id").and_then(|v| v.as_u64()) {
                        active_model.sub_genre_id = Set(Some(sub_genre_id as u32));
                    }
                    if let Some(lyrics) = obj.get("lyrics").and_then(|v| v.as_str()) {
                        active_model.lyrics = Set(Some(lyrics.to_string()));
                    }
                    if let Some(lyrics_writer) = obj.get("lyrics_writer").and_then(|v| v.as_str()) {
                        active_model.lyrics_writer = Set(Some(lyrics_writer.to_string()));
                    }
                    if let Some(music_writer) = obj.get("music_writer").and_then(|v| v.as_str()) {
                        active_model.music_writer = Set(Some(music_writer.to_string()));
                    }
                    if let Some(license) = obj.get("license").and_then(|v| v.as_str()) {
                        active_model.license = Set(Some(license.to_string()));
                    }
                    if let Some(publisher) = obj.get("publisher").and_then(|v| v.as_str()) {
                        active_model.publisher = Set(Some(publisher.to_string()));
                    }
                    if let Some(length) = obj.get("length").and_then(|v| v.as_u64()) {
                        active_model.length = Set(length);
                    }
                    if let Some(release_date) = obj.get("release_date").and_then(|v| v.as_str()) {
                        if let Ok(date) = chrono::NaiveDate::parse_from_str(release_date, "%Y-%m-%d") {
                            active_model.release_date = Set(Some(date));
                        }
                    }
                    if let Some(itunes_url) = obj.get("itunes_url").and_then(|v| v.as_str()) {
                        active_model.itunes_url = Set(Some(itunes_url.to_string()));
                    }
                    if let Some(itunes_img) = obj.get("itunes_img").and_then(|v| v.as_str()) {
                        active_model.itunes_img = Set(Some(itunes_img.to_string()));
                    }
                    if let Some(itunes_preview) = obj.get("itunes_preview").and_then(|v| v.as_str()) {
                        active_model.itunes_preview = Set(Some(itunes_preview.to_string()));
                    }
                    if let Some(itunes_id) = obj.get("itunes_id").and_then(|v| v.as_u64()) {
                        active_model.itunes_id = Set(Some(itunes_id as u32));
                    }
                    if let Some(rovi_id) = obj.get("rovi_id").and_then(|v| v.as_str()) {
                        active_model.rovi_id = Set(Some(rovi_id.to_string()));
                    }
                    if let Some(echo_id) = obj.get("echo_id").and_then(|v| v.as_str()) {
                        active_model.echo_id = Set(Some(echo_id.to_string()));
                    }

                    active_model.update(txn).await?;
                }

                // 2. Song performers — dedupe on (name, instrument) lowercased
                {
                    let target_performers = SongPerformer::find()
                        .filter(SongPerformerColumn::SongId.eq(target_id))
                        .all(txn)
                        .await?;

                    let existing_performer_keys: HashSet<(String, String)> = target_performers
                        .into_iter()
                        .map(|p| (
                            p.name.unwrap_or_default().to_lowercase(),
                            p.instrument.unwrap_or_default().to_lowercase(),
                        ))
                        .collect();

                    for from_id in &from_ids {
                        let performers = SongPerformer::find()
                            .filter(SongPerformerColumn::SongId.eq(*from_id))
                            .all(txn)
                            .await?;

                        for perf in performers {
                            let key = (
                                perf.name.clone().unwrap_or_default().to_lowercase(),
                                perf.instrument.clone().unwrap_or_default().to_lowercase(),
                            );
                            if existing_performer_keys.contains(&key) {
                                let active: crate::models::song_performers::ActiveModel = perf.into();
                                active.delete(txn).await?;
                                stats.performers_deduped += 1;
                            } else {
                                let mut active: crate::models::song_performers::ActiveModel = perf.into();
                                active.song_id = Set(Some(target_id));
                                active.update(txn).await?;
                                stats.performers_moved += 1;
                            }
                        }
                    }
                }

                // 3. Albums_songs — dedupe on album_id
                {
                    let target_album_songs = AlbumsSongs::find()
                        .filter(AlbumsSongsColumn::SongId.eq(target_id))
                        .all(txn)
                        .await?;

                    let existing_album_ids: HashSet<u32> = target_album_songs
                        .into_iter()
                        .map(|as_| as_.album_id)
                        .collect();

                    for from_id in &from_ids {
                        let album_songs = AlbumsSongs::find()
                            .filter(AlbumsSongsColumn::SongId.eq(*from_id))
                            .all(txn)
                            .await?;

                        for as_ in album_songs {
                            if existing_album_ids.contains(&as_.album_id) {
                                let active: crate::models::albums_songs::ActiveModel = as_.into();
                                active.delete(txn).await?;
                                stats.album_associations_deduped += 1;
                            } else {
                                let mut active: crate::models::albums_songs::ActiveModel = as_.into();
                                active.song_id = Set(target_id);
                                active.update(txn).await?;
                                stats.album_associations_moved += 1;
                            }
                        }
                    }
                }

                // 4. Radio playlists — aggregate spins on composite key match
                {
                    let target_playlists = RadioPlaylist::find()
                        .filter(RadioPlaylistColumn::SongId.eq(target_id))
                        .all(txn)
                        .await?;

                    // Key: (radio_station_id, band_id, album_id) -> (id, spins, subtract_spins)
                    let mut target_map: HashMap<(Option<u32>, Option<u32>, Option<u32>), (u32, i32, i32)> = HashMap::new();
                    for pl in &target_playlists {
                        target_map.insert(
                            (pl.radio_station_id, pl.band_id, pl.album_id),
                            (pl.id, pl.spins, pl.subtract_spins),
                        );
                    }

                    for from_id in &from_ids {
                        let playlists = RadioPlaylist::find()
                            .filter(RadioPlaylistColumn::SongId.eq(*from_id))
                            .all(txn)
                            .await?;

                        for pl in playlists {
                            let key = (pl.radio_station_id, pl.band_id, pl.album_id);
                            if let Some(&(target_pl_id, target_spins, target_sub_spins)) = target_map.get(&key) {
                                // Aggregate: sum spins into target, delete source
                                let target_entry = RadioPlaylist::find_by_id(target_pl_id).one(txn).await?
                                    .ok_or(DbErr::RecordNotFound("Target playlist entry not found".to_string()))?;
                                let mut active: crate::models::radio_playlists::ActiveModel = target_entry.into();
                                active.spins = Set(target_spins + pl.spins);
                                active.subtract_spins = Set(target_sub_spins + pl.subtract_spins);
                                active.update(txn).await?;

                                let source_active: crate::models::radio_playlists::ActiveModel = pl.into();
                                source_active.delete(txn).await?;
                                stats.radio_playlists_aggregated += 1;
                            } else {
                                // No match — move to target song
                                let mut active: crate::models::radio_playlists::ActiveModel = pl.into();
                                active.song_id = Set(Some(target_id));
                                active.update(txn).await?;
                                stats.radio_playlists_moved += 1;
                            }
                        }
                    }
                }

                // 5. Radio playlist archives — aggregate spins on composite key match (includes week_ending)
                {
                    let target_archives = RadioPlaylistArchive::find()
                        .filter(RadioPlaylistArchiveColumn::SongId.eq(target_id))
                        .all(txn)
                        .await?;

                    // Key: (radio_station_id, band_id, album_id, week_ending) -> (id, spins, subtract_spins)
                    let mut target_map: HashMap<(Option<u32>, Option<u32>, Option<u32>, Option<chrono::NaiveDate>), (u32, i32, i32)> = HashMap::new();
                    for arch in &target_archives {
                        target_map.insert(
                            (arch.radio_station_id, arch.band_id, arch.album_id, arch.week_ending),
                            (arch.id, arch.spins, arch.subtract_spins),
                        );
                    }

                    for from_id in &from_ids {
                        let archives = RadioPlaylistArchive::find()
                            .filter(RadioPlaylistArchiveColumn::SongId.eq(*from_id))
                            .all(txn)
                            .await?;

                        for arch in archives {
                            let key = (arch.radio_station_id, arch.band_id, arch.album_id, arch.week_ending);
                            if let Some(&(target_arch_id, target_spins, target_sub_spins)) = target_map.get(&key) {
                                let target_entry = RadioPlaylistArchive::find_by_id(target_arch_id).one(txn).await?
                                    .ok_or(DbErr::RecordNotFound("Target archive entry not found".to_string()))?;
                                let mut active: crate::models::radio_playlist_archives::ActiveModel = target_entry.into();
                                active.spins = Set(target_spins + arch.spins);
                                active.subtract_spins = Set(target_sub_spins + arch.subtract_spins);
                                active.update(txn).await?;

                                let source_active: crate::models::radio_playlist_archives::ActiveModel = arch.into();
                                source_active.delete(txn).await?;
                                stats.radio_playlist_archives_aggregated += 1;
                            } else {
                                let mut active: crate::models::radio_playlist_archives::ActiveModel = arch.into();
                                active.song_id = Set(Some(target_id));
                                active.update(txn).await?;
                                stats.radio_playlist_archives_moved += 1;
                            }
                        }
                    }
                }

                // 6. Staff playlists — aggregate spins on composite key match
                {
                    let target_playlists = StaffPlaylist::find()
                        .filter(StaffPlaylistColumn::SongId.eq(target_id))
                        .all(txn)
                        .await?;

                    // Key: (staff_member_id, band_id, album_id) -> (id, spins)
                    let mut target_map: HashMap<(Option<u32>, Option<u32>, Option<u32>), (u32, Option<i32>)> = HashMap::new();
                    for pl in &target_playlists {
                        target_map.insert(
                            (pl.staff_member_id, pl.band_id, pl.album_id),
                            (pl.id, pl.spins),
                        );
                    }

                    for from_id in &from_ids {
                        let playlists = StaffPlaylist::find()
                            .filter(StaffPlaylistColumn::SongId.eq(*from_id))
                            .all(txn)
                            .await?;

                        for pl in playlists {
                            let key = (pl.staff_member_id, pl.band_id, pl.album_id);
                            if let Some(&(target_pl_id, target_spins)) = target_map.get(&key) {
                                let target_entry = StaffPlaylist::find_by_id(target_pl_id).one(txn).await?
                                    .ok_or(DbErr::RecordNotFound("Target staff playlist entry not found".to_string()))?;
                                let mut active: crate::models::staff_playlists::ActiveModel = target_entry.into();
                                active.spins = Set(Some(target_spins.unwrap_or(0) + pl.spins.unwrap_or(0)));
                                active.update(txn).await?;

                                let source_active: crate::models::staff_playlists::ActiveModel = pl.into();
                                source_active.delete(txn).await?;
                                stats.staff_playlists_aggregated += 1;
                            } else {
                                let mut active: crate::models::staff_playlists::ActiveModel = pl.into();
                                active.song_id = Set(Some(target_id));
                                active.update(txn).await?;
                                stats.staff_playlists_moved += 1;
                            }
                        }
                    }
                }

                // 7. Staff playlist archives — aggregate spins on composite key match (includes week_ending)
                {
                    let target_archives = StaffPlaylistArchive::find()
                        .filter(StaffPlaylistArchiveColumn::SongId.eq(target_id))
                        .all(txn)
                        .await?;

                    // Key: (staff_member_id, band_id, album_id, week_ending) -> (id, spins)
                    let mut target_map: HashMap<(Option<u32>, Option<u32>, Option<u32>, Option<chrono::NaiveDate>), (u32, Option<i32>)> = HashMap::new();
                    for arch in &target_archives {
                        target_map.insert(
                            (arch.staff_member_id, arch.band_id, arch.album_id, arch.week_ending),
                            (arch.id, arch.spins),
                        );
                    }

                    for from_id in &from_ids {
                        let archives = StaffPlaylistArchive::find()
                            .filter(StaffPlaylistArchiveColumn::SongId.eq(*from_id))
                            .all(txn)
                            .await?;

                        for arch in archives {
                            let key = (arch.staff_member_id, arch.band_id, arch.album_id, arch.week_ending);
                            if let Some(&(target_arch_id, target_spins)) = target_map.get(&key) {
                                let target_entry = StaffPlaylistArchive::find_by_id(target_arch_id).one(txn).await?
                                    .ok_or(DbErr::RecordNotFound("Target staff archive entry not found".to_string()))?;
                                let mut active: crate::models::staff_playlist_archives::ActiveModel = target_entry.into();
                                active.spins = Set(Some(target_spins.unwrap_or(0) + arch.spins.unwrap_or(0)));
                                active.update(txn).await?;

                                let source_active: crate::models::staff_playlist_archives::ActiveModel = arch.into();
                                source_active.delete(txn).await?;
                                stats.staff_playlist_archives_aggregated += 1;
                            } else {
                                let mut active: crate::models::staff_playlist_archives::ActiveModel = arch.into();
                                active.song_id = Set(Some(target_id));
                                active.update(txn).await?;
                                stats.staff_playlist_archives_moved += 1;
                            }
                        }
                    }
                }

                // 8. Radio raw datas — move all
                for from_id in &from_ids {
                    let raw_datas = RadioRawData::find()
                        .filter(RadioRawDataColumn::SongId.eq(*from_id))
                        .all(txn)
                        .await?;

                    for rd in raw_datas {
                        let mut active: crate::models::radio_raw_datas::ActiveModel = rd.into();
                        active.song_id = Set(Some(target_id));
                        active.update(txn).await?;
                        stats.raw_data_updated += 1;
                    }
                }

                // 9. Song rankings — move all
                for from_id in &from_ids {
                    let rankings = SongRanking::find()
                        .filter(SongRankingColumn::SongId.eq(*from_id))
                        .all(txn)
                        .await?;

                    for ranking in rankings {
                        let mut active: crate::models::song_rankings::ActiveModel = ranking.into();
                        active.song_id = Set(Some(target_id));
                        active.update(txn).await?;
                        stats.rankings_moved += 1;
                    }
                }

                // 10. Song total stats — move all
                for from_id in &from_ids {
                    let total_stats = SongTotalStats::find()
                        .filter(SongTotalStatsColumn::SongId.eq(*from_id))
                        .all(txn)
                        .await?;

                    for ts in total_stats {
                        let mut active: crate::models::song_total_stats::ActiveModel = ts.into();
                        active.song_id = Set(Some(target_id));
                        active.update(txn).await?;
                        stats.total_stats_moved += 1;
                    }
                }

                // 11. Song weekly stats — move all
                for from_id in &from_ids {
                    let weekly_stats = SongWeeklyStats::find()
                        .filter(SongWeeklyStatsColumn::SongId.eq(*from_id))
                        .all(txn)
                        .await?;

                    for ws in weekly_stats {
                        let mut active: crate::models::song_weekly_stats::ActiveModel = ws.into();
                        active.song_id = Set(target_id);
                        active.update(txn).await?;
                        stats.weekly_stats_moved += 1;
                    }
                }

                // 12. Temp song total stats — move all
                for from_id in &from_ids {
                    let temp_stats = TempSongTotalStats::find()
                        .filter(TempSongTotalStatsColumn::SongId.eq(*from_id))
                        .all(txn)
                        .await?;

                    for ts in temp_stats {
                        let mut active: crate::models::temp_song_total_stats::ActiveModel = ts.into();
                        active.song_id = Set(Some(target_id));
                        active.update(txn).await?;
                        stats.total_stats_moved += 1;
                    }
                }

                // 13. Song aliases — dedupe on (band_id, radio_station_id, alias_key)
                {
                    let target_aliases = SongAlias::find()
                        .filter(SongAliasColumn::SongId.eq(target_id))
                        .all(txn)
                        .await?;

                    let mut existing_alias_keys: HashSet<(u32, Option<u32>, String)> = target_aliases
                        .into_iter()
                        .map(|a| (a.band_id, a.radio_station_id, a.alias_key))
                        .collect();

                    for from_id in &from_ids {
                        let aliases = SongAlias::find()
                            .filter(SongAliasColumn::SongId.eq(*from_id))
                            .all(txn)
                            .await?;

                        for alias in aliases {
                            let key = (alias.band_id, alias.radio_station_id, alias.alias_key.clone());
                            if existing_alias_keys.contains(&key) {
                                let active: crate::models::song_aliases::ActiveModel = alias.into();
                                active.delete(txn).await?;
                                stats.aliases_deduped += 1;
                            } else {
                                let mut active: crate::models::song_aliases::ActiveModel = alias.into();
                                active.song_id = Set(target_id);
                                active.update(txn).await?;
                                existing_alias_keys.insert(key);
                                stats.aliases_moved += 1;
                            }
                        }
                    }
                }

                // 14-16. Song duplicate candidates — reassign, remove self-refs, deduplicate pairs
                {
                    for from_id in &from_ids {
                        // Reassign song_id_1 references
                        let candidates_1 = SongDuplicateCandidate::find()
                            .filter(SongDuplicateCandidateColumn::SongId1.eq(*from_id))
                            .all(txn)
                            .await?;

                        for cand in candidates_1 {
                            let mut active: crate::models::song_duplicate_candidates::ActiveModel = cand.into();
                            active.song_id_1 = Set(target_id);
                            active.update(txn).await?;
                            stats.duplicate_candidates_updated += 1;
                        }

                        // Reassign song_id_2 references
                        let candidates_2 = SongDuplicateCandidate::find()
                            .filter(SongDuplicateCandidateColumn::SongId2.eq(*from_id))
                            .all(txn)
                            .await?;

                        for cand in candidates_2 {
                            let mut active: crate::models::song_duplicate_candidates::ActiveModel = cand.into();
                            active.song_id_2 = Set(target_id);
                            active.update(txn).await?;
                            stats.duplicate_candidates_updated += 1;
                        }
                    }

                    // Remove self-referencing rows (song_id_1 == song_id_2 == target_id)
                    let self_refs = SongDuplicateCandidate::find()
                        .filter(SongDuplicateCandidateColumn::SongId1.eq(target_id))
                        .filter(SongDuplicateCandidateColumn::SongId2.eq(target_id))
                        .all(txn)
                        .await?;

                    for cand in self_refs {
                        let active: crate::models::song_duplicate_candidates::ActiveModel = cand.into();
                        active.delete(txn).await?;
                        stats.duplicate_candidates_cleaned += 1;
                    }

                    // Deduplicate pairs: load all candidates involving target, remove duplicate pairs
                    let all_target_candidates = SongDuplicateCandidate::find()
                        .filter(
                            Condition::any()
                                .add(SongDuplicateCandidateColumn::SongId1.eq(target_id))
                                .add(SongDuplicateCandidateColumn::SongId2.eq(target_id))
                        )
                        .all(txn)
                        .await?;

                    let mut seen_pairs: HashSet<(u32, u32)> = HashSet::new();
                    for cand in all_target_candidates {
                        let pair = (
                            std::cmp::min(cand.song_id_1, cand.song_id_2),
                            std::cmp::max(cand.song_id_1, cand.song_id_2),
                        );
                        if !seen_pairs.insert(pair) {
                            // Duplicate pair — delete
                            let active: crate::models::song_duplicate_candidates::ActiveModel = cand.into();
                            active.delete(txn).await?;
                            stats.duplicate_candidates_cleaned += 1;
                        }
                    }
                }

                // 17. Delete source songs
                for from_id in &from_ids {
                    Song::delete_by_id(*from_id).exec(txn).await?;
                    stats.songs_deleted += 1;
                }

                // 18. Get and return the updated target song
                let merged_song = Song::find_by_id(target_id).one(txn).await?
                    .ok_or(DbErr::RecordNotFound("Merged song not found".to_string()))?;

                Ok(SongMergeResult {
                    merged_song,
                    stats,
                })
            })
        }).await.map_err(|e| match e {
            TransactionError::Connection(db_err) => db_err,
            TransactionError::Transaction(db_err) => db_err,
        })?;

        // Audit log (fire-and-forget — don't fail the merge if logging fails)
        let _ = ActionLogService::record_song_merge(
            db,
            target_id_for_log,
            user_id,
            &before_state,
            &result.merged_song,
            &result.stats,
            &from_ids_for_log,
            ip_address,
        ).await;

        Ok(result)
    }
}
