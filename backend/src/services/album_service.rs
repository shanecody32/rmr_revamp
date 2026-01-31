use crate::models::albums::{Entity as Album, Model as AlbumModel, ActiveModel as AlbumActiveModel, Column as AlbumColumn};
use crate::models::songs::{Entity as Song, Model as SongModel, Column as SongColumn};
use crate::models::albums_songs::{Entity as AlbumSong, Model as AlbumSongModel, Column as AlbumSongColumn};
use crate::models::genres::Model as GenreModel;
use crate::models::sub_genres::Model as SubGenreModel;
use crate::models::album_images::{Entity as AlbumImage, Model as AlbumImageModel, Column as AlbumImageColumn};
use crate::models::bands::Model as BandModel;
use crate::models::albums_bands::{Entity as AlbumsBands, Column as AlbumsBandsColumn};
use crate::models::radio_playlists::{Entity as RadioPlaylist, Column as RadioPlaylistColumn};
use crate::models::radio_playlist_archives::{Entity as RadioPlaylistArchive, Column as RadioPlaylistArchiveColumn};
use crate::models::staff_playlists::{Entity as StaffPlaylist, Column as StaffPlaylistColumn};
use crate::models::staff_playlist_archives::{Entity as StaffPlaylistArchive, Column as StaffPlaylistArchiveColumn};
use crate::models::album_rankings::{Entity as AlbumRanking, Column as AlbumRankingColumn};
use crate::models::album_total_stats::{Entity as AlbumTotalStats, Column as AlbumTotalStatsColumn};
use crate::models::album_weekly_stats::{Entity as AlbumWeeklyStats, Column as AlbumWeeklyStatsColumn};
use crate::models::album_duplicate_candidates::{Entity as AlbumDuplicateCandidate, Column as AlbumDuplicateCandidateColumn};
use crate::services::action_log_service::ActionLogService;
use sea_orm::*;
use sea_orm::prelude::Expr;
use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};
use chrono::NaiveDate;
use crate::services::types::{PaginatedResponse, PaginationInfo, SimilarityParams, SimilarResult};
use crate::utils::similarity::find_similar_pipeline;
use crate::models::album_aliases::{Entity as AlbumAlias, Column as AlbumAliasColumn};
use crate::models::albums_sub_genres::{Entity as AlbumSubGenre, Column as AlbumSubGenreColumn, ActiveModel as AlbumSubGenreActiveModel};
use crate::job_state::TaskJobState;
use std::sync::Arc;
use std::collections::{HashMap, HashSet};
use tokio::sync::RwLock;

/// Default chunk size for batched album genre processing.
/// MariaDB has a limit of 65,535 placeholders per prepared statement,
/// so we keep this under that limit for IN clauses.
const DEFAULT_BATCH_CHUNK_SIZE: u64 = 10_000;

/// Get the chunk size from environment variable or use default
fn get_batch_chunk_size() -> u64 {
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

pub struct AlbumService;

impl AlbumService {
    pub async fn get_albums(
        db: &DatabaseConnection,
        params: AlbumFilterParams,
    ) -> Result<PaginatedResponse<AlbumResponse>, DbErr> {
        let page = params.page.unwrap_or(1);
        let page_size = params.page_size.unwrap_or(10);

        let mut query = Album::find();

        if let Some(name) = params.name {
            if !name.is_empty() {
                match params.name_filter_type.as_deref() {
                    Some("starts_with") => {
                        query = query.filter(crate::models::albums::Column::Name.starts_with(&name));
                    }
                    Some("ends_with") => {
                        query = query.filter(crate::models::albums::Column::Name.ends_with(&name));
                    }
                    Some("exact_match") => {
                        query = query.filter(crate::models::albums::Column::Name.eq(&name));
                    }
                    _ => {
                        query = query.filter(crate::models::albums::Column::Name.contains(&name));
                    }
                }
            }
        }

        if let Some(verified) = params.verified {
            query = query.filter(crate::models::albums::Column::Verified.eq(if verified { 1 } else { 0 }));
        }
        if let Some(approved) = params.approved {
            query = query.filter(crate::models::albums::Column::Approved.eq(if approved { 1 } else { 0 }));
        }

        let paginator = query.paginate(db, page_size);
        let total_items = paginator.num_items().await?;
        let total_pages = paginator.num_pages().await?;

        let album_models = paginator.fetch_page(page - 1).await?;
        let results = Self::load_album_relations(db, album_models).await?;

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

    pub async fn get_album_by_id(db: &DatabaseConnection, id: u32) -> Result<Option<AlbumResponse>, DbErr> {
        let album = Album::find_by_id(id).one(db).await?;
        if let Some(album) = album {
            let relations = Self::load_album_relations(db, vec![album]).await?;
            Ok(relations.into_iter().next())
        } else {
            Ok(None)
        }
    }

    pub async fn load_album_relations(
        db: &DatabaseConnection,
        albums: Vec<AlbumModel>,
    ) -> Result<Vec<AlbumResponse>, DbErr> {
        use std::collections::{HashMap, HashSet};

        if albums.is_empty() {
            return Ok(vec![]);
        }

        let album_ids: Vec<u32> = albums.iter().map(|a| a.id).collect();

        // Load images and group by album_id - O(n) instead of O(albums × images)
        let images = crate::models::album_images::Entity::find()
            .filter(crate::models::album_images::Column::AlbumId.is_in(album_ids.clone()))
            .all(db)
            .await?;
        let images_by_album: HashMap<u32, Vec<_>> = images.into_iter()
            .filter_map(|img| img.album_id.map(|id| (id, img)))
            .fold(HashMap::new(), |mut acc, (id, img)| {
                acc.entry(id).or_default().push(img);
                acc
            });

        // Load songs through albums_songs and group by album_id
        let album_songs = crate::models::albums_songs::Entity::find()
            .filter(crate::models::albums_songs::Column::AlbumId.is_in(album_ids.clone()))
            .all(db)
            .await?;
        let album_songs_by_album: HashMap<u32, Vec<_>> = album_songs.iter()
            .map(|asong| (asong.album_id, asong.clone()))
            .fold(HashMap::new(), |mut acc, (id, asong)| {
                acc.entry(id).or_default().push(asong);
                acc
            });

        let song_ids: Vec<u32> = album_songs.iter().map(|asong| asong.song_id).collect();
        let songs = crate::models::songs::Entity::find()
            .filter(crate::models::songs::Column::Id.is_in(song_ids))
            .all(db)
            .await?;
        // Build song lookup map - O(1) lookup instead of O(songs)
        let song_map: HashMap<u32, _> = songs.into_iter()
            .map(|s| (s.id, s))
            .collect();

        // Load bands through albums_bands and group by album_id
        let albums_bands = crate::models::albums_bands::Entity::find()
            .filter(crate::models::albums_bands::Column::AlbumId.is_in(album_ids.clone()))
            .all(db)
            .await?;
        let albums_bands_by_album: HashMap<u32, Vec<_>> = albums_bands.iter()
            .filter_map(|ab| ab.album_id.map(|id| (id, ab.clone())))
            .fold(HashMap::new(), |mut acc, (id, ab)| {
                acc.entry(id).or_default().push(ab);
                acc
            });

        let band_ids: Vec<u32> = albums_bands.iter().filter_map(|ab| ab.band_id).collect();
        let bands = crate::models::bands::Entity::find()
            .filter(crate::models::bands::Column::Id.is_in(band_ids))
            .all(db)
            .await?;
        // Build band lookup map - O(1) lookup instead of O(bands)
        let band_map: HashMap<u32, _> = bands.into_iter()
            .map(|b| (b.id, b))
            .collect();

        // Load genres/sub-genres through albums_sub_genres and group by album_id
        let albums_sub_genres = crate::models::albums_sub_genres::Entity::find()
            .filter(crate::models::albums_sub_genres::Column::AlbumId.is_in(album_ids.clone()))
            .all(db)
            .await?;
        let albums_sub_genres_by_album: HashMap<u32, Vec<_>> = albums_sub_genres.iter()
            .filter_map(|asg| asg.album_id.map(|id| (id, asg.clone())))
            .fold(HashMap::new(), |mut acc, (id, asg)| {
                acc.entry(id).or_default().push(asg);
                acc
            });

        // Collect all sub_genre_ids we need
        let mut all_sub_genre_ids: HashSet<u32> = albums_sub_genres.iter()
            .filter_map(|asg| asg.sub_genre_id)
            .collect();

        // Add charting sub genre IDs from albums
        for album in &albums {
            if let Some(id) = album.sub_genre_for_charting {
                all_sub_genre_ids.insert(id);
            }
        }

        // Add sub genre IDs from songs
        for song in song_map.values() {
            if let Some(id) = song.sub_genre_id {
                all_sub_genre_ids.insert(id as u32);
            }
        }

        let sub_genres = crate::models::sub_genres::Entity::find()
            .filter(crate::models::sub_genres::Column::Id.is_in(all_sub_genre_ids.into_iter().collect::<Vec<_>>()))
            .all(db)
            .await?;
        // Build sub_genre lookup map - O(1) lookup instead of O(sub_genres)
        let sub_genre_map: HashMap<u32, _> = sub_genres.into_iter()
            .map(|sg| (sg.id, sg))
            .collect();

        let genre_ids: Vec<u32> = sub_genre_map.values()
            .filter_map(|sg| sg.genre_id)
            .collect();
        let genres = crate::models::genres::Entity::find()
            .filter(crate::models::genres::Column::Id.is_in(genre_ids))
            .all(db)
            .await?;
        // Build genre lookup map - O(1) lookup instead of O(genres)
        let genre_map: HashMap<u32, _> = genres.into_iter()
            .map(|g| (g.id, g))
            .collect();

        // Build results with O(1) lookups instead of O(n²) nested finds
        let mut results = Vec::with_capacity(albums.len());
        for album in albums {
            let album_id = album.id;

            // O(1) lookup + clone instead of O(images) filter
            let album_images = images_by_album.get(&album_id)
                .cloned()
                .unwrap_or_default();

            // O(album_songs for this album) instead of O(all_album_songs × songs × sub_genres)
            let current_album_songs: Vec<_> = album_songs_by_album.get(&album_id)
                .map(|asongs| {
                    asongs.iter()
                        .filter_map(|asong| {
                            song_map.get(&asong.song_id).map(|s| {
                                let song_sub_genre = s.sub_genre_id
                                    .and_then(|id| id.try_into().ok())
                                    .and_then(|id: u32| sub_genre_map.get(&id).cloned());
                                SongWithTrackInfo {
                                    album_song: asong.clone(),
                                    song: s.clone(),
                                    sub_genre: song_sub_genre,
                                }
                            })
                        })
                        .collect()
                })
                .unwrap_or_default();

            // O(albums_bands for this album) instead of O(all_albums_bands × bands)
            let album_bands: Vec<_> = albums_bands_by_album.get(&album_id)
                .map(|abs| {
                    abs.iter()
                        .filter_map(|ab| ab.band_id.and_then(|id| band_map.get(&id).cloned()))
                        .collect()
                })
                .unwrap_or_default();

            // O(albums_sub_genres for this album) instead of O(all_albums_sub_genres × sub_genres)
            let album_sub_genres: Vec<_> = albums_sub_genres_by_album.get(&album_id)
                .map(|asgs| {
                    asgs.iter()
                        .filter_map(|asg| asg.sub_genre_id.and_then(|id| sub_genre_map.get(&id).cloned()))
                        .collect()
                })
                .unwrap_or_default();

            // O(album_sub_genres) instead of O(genres × album_genre_ids)
            let album_genre_ids: HashSet<u32> = album_sub_genres.iter()
                .filter_map(|sg| sg.genre_id)
                .collect();
            let album_genres: Vec<_> = album_genre_ids.iter()
                .filter_map(|id| genre_map.get(id).cloned())
                .collect();

            results.push(AlbumResponse {
                album,
                songs: current_album_songs,
                genres: album_genres,
                sub_genres: album_sub_genres,
                images: album_images,
                bands: album_bands,
            });
        }

        Ok(results)
    }

    pub async fn create_album(db: &DatabaseConnection, data: AlbumModel) -> Result<AlbumModel, DbErr> {
        let active_model: AlbumActiveModel = AlbumActiveModel {
            name: Set(data.name),
            label_id: Set(data.label_id),
            release_date: Set(data.release_date),
            img: Set(data.img),
            ..Default::default()
        };
        active_model.insert(db).await
    }

    pub async fn get_album_songs(db: &DatabaseConnection, id: u32) -> Result<Vec<crate::models::songs::Model>, DbErr> {
        let album = Album::find_by_id(id).one(db).await?;
        if let Some(album) = album {
            album.find_related(crate::models::songs::Entity).all(db).await
        } else {
            Ok(vec![])
        }
    }

    pub async fn update_album(db: &DatabaseConnection, id: u32, data: AlbumModel) -> Result<AlbumModel, DbErr> {
        let album = Album::find_by_id(id).one(db).await?;
        if let Some(album) = album {
            let mut active_model: AlbumActiveModel = album.into();
            active_model.name = Set(data.name);
            active_model.label_id = Set(data.label_id);
            active_model.release_date = Set(data.release_date);
            active_model.img = Set(data.img);
            // ... update other fields as needed
            active_model.update(db).await
        } else {
            Err(DbErr::RecordNotFound("Album not found".to_string()))
        }
    }

    pub async fn update_album_full(
        db: &DatabaseConnection,
        id: u32,
        req: UpdateAlbumRequest,
    ) -> Result<AlbumModel, DbErr> {
        let album = Album::find_by_id(id).one(db).await?
            .ok_or(DbErr::RecordNotFound("Album not found".to_string()))?;

        let mut active_model: AlbumActiveModel = album.into();

        if let Some(name) = req.name { active_model.name = Set(Some(name)); }
        if let Some(label_id) = req.label_id { active_model.label_id = Set(Some(label_id)); }
        if let Some(itunes_url) = req.itunes_url { active_model.itunes_url = Set(Some(itunes_url)); }
        if let Some(cdbaby_url) = req.cdbaby_url { active_model.cdbaby_url = Set(Some(cdbaby_url)); }
        if let Some(amazon_url) = req.amazon_url { active_model.amazon_url = Set(Some(amazon_url)); }
        if let Some(itunes_id) = req.itunes_id { active_model.itunes_id = Set(Some(itunes_id)); }
        if let Some(rovi_id) = req.rovi_id { active_model.rovi_id = Set(Some(rovi_id)); }
        if let Some(about) = req.about { active_model.about = Set(Some(about)); }
        if let Some(thanks) = req.thanks { active_model.thanks = Set(Some(thanks)); }
        if let Some(producer) = req.producer { active_model.producer = Set(Some(producer)); }
        if let Some(engineer) = req.engineer { active_model.engineer = Set(Some(engineer)); }
        if let Some(studio) = req.studio { active_model.studio = Set(Some(studio)); }
        if let Some(master) = req.master { active_model.master = Set(Some(master)); }
        if let Some(verified) = req.verified { active_model.verified = Set(verified); }
        if let Some(approved) = req.approved { active_model.approved = Set(approved); }

        if let Some(release_date_str) = req.release_date {
             if let Ok(date) = NaiveDate::parse_from_str(&release_date_str, "%Y-%m-%d") {
                 active_model.release_date = Set(Some(date));
             }
        }

        let updated_album = active_model.update(db).await?;

        // Sync songs
        if let Some(songs_input) = req.songs {
            // Remove existing relations
            crate::models::albums_songs::Entity::delete_many()
                .filter(crate::models::albums_songs::Column::AlbumId.eq(id))
                .exec(db)
                .await?;

            // Add new relations
            let mut new_relations = Vec::new();
            for (idx, song_input) in songs_input.into_iter().enumerate() {
                let track_num = song_input.track_number.or(Some((idx + 1) as i32));
                new_relations.push(crate::models::albums_songs::ActiveModel {
                    album_id: Set(id),
                    song_id: Set(song_input.song_id),
                    track_number: Set(track_num),
                    track_num: Set(track_num),
                    disc_number: Set(song_input.disc_number.or(Some(1))),
                    ..Default::default()
                });
            }

            if !new_relations.is_empty() {
                crate::models::albums_songs::Entity::insert_many(new_relations).exec(db).await?;
            }
        }

        Ok(updated_album)
    }

    pub async fn delete_album(db: &DatabaseConnection, id: u32) -> Result<DeleteResult, DbErr> {
        Album::delete_by_id(id).exec(db).await
    }

    pub async fn get_similar_albums(
        db: &DatabaseConnection,
        params: SimilarityParams,
    ) -> Result<Vec<SimilarResult<AlbumModel>>, DbErr> {
        let mut query = AlbumAlias::find();

        if let Some(true) = params.restrict_to_parent {
            if let Some(band_id) = params.band_id {
                query = query.filter(AlbumAliasColumn::BandId.eq(band_id));
            }
        }

        let results: Vec<SimilarResult<crate::models::album_aliases::Model>> = find_similar_pipeline(
            db,
            query,
            crate::utils::similarity::pipeline::SimilarityColumns {
                name: AlbumAliasColumn::AliasKey,
                slug: AlbumAliasColumn::Slug,
                sanitized: Some(AlbumAliasColumn::SanitizedName),
                soundex: Some(AlbumAliasColumn::SoundexKey),
                phonetic: Some(AlbumAliasColumn::PhoneticKey),
                metaphone: Some(AlbumAliasColumn::MetaphoneKey),
                dmetaphone: Some(AlbumAliasColumn::DmetaphoneKey),
                dmetaphone_alt: Some(AlbumAliasColumn::DmetaphoneAltKey),
            },
            params,
            AlbumAliasColumn::AlbumId,
            |m| m.alias_key.clone(),
        ).await?;

        let mut album_ids: Vec<u32> = results.iter().map(|r| r.model.album_id).collect();
        album_ids.sort();
        album_ids.dedup();

        if album_ids.is_empty() {
            return Ok(vec![]);
        }

        let albums = Album::find()
            .filter(crate::models::albums::Column::Id.is_in(album_ids))
            .all(db)
            .await?;

        let mut final_results = Vec::new();
        for r in results {
            if let Some(album) = albums.iter().find(|a| a.id == r.model.album_id) {
                final_results.push(SimilarResult {
                    model: album.clone(),
                    similarity_score: r.similarity_score,
                });
            }
            if final_results.len() >= 50 { break; }
        }

        let mut seen = std::collections::HashSet::new();
        final_results.retain(|r| seen.insert(r.model.id));

        Ok(final_results)
    }

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
                    if let Some(release_date_str) = obj.get("release_date").and_then(|v| v.as_str()) {
                        if let Ok(date) = NaiveDate::parse_from_str(release_date_str, "%Y-%m-%d") {
                            active_model.release_date = Set(Some(date));
                        }
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

                for from_id in &from_ids {
                    let images = AlbumImage::find()
                        .filter(AlbumImageColumn::AlbumId.eq(*from_id))
                        .all(txn)
                        .await?;

                    for img in images {
                        if let Some(ref path) = img.path {
                            if existing_paths.contains(path) {
                                stats.images_deduped += 1;
                                continue;
                            }
                        }
                        let mut active: crate::models::album_images::ActiveModel = img.into();
                        active.album_id = Set(Some(target_id));
                        active.update(txn).await?;
                        stats.images_moved += 1;
                    }
                }

                // 3. Move albums_bands associations (dedupe by band_id)
                let existing_band_ids: HashSet<u32> = AlbumsBands::find()
                    .filter(AlbumsBandsColumn::AlbumId.eq(target_id))
                    .all(txn)
                    .await?
                    .into_iter()
                    .filter_map(|ab| ab.band_id)
                    .collect();

                for from_id in &from_ids {
                    let album_bands = AlbumsBands::find()
                        .filter(AlbumsBandsColumn::AlbumId.eq(*from_id))
                        .all(txn)
                        .await?;

                    for ab in album_bands {
                        if let Some(band_id) = ab.band_id {
                            if existing_band_ids.contains(&band_id) {
                                let active: crate::models::albums_bands::ActiveModel = ab.into();
                                active.delete(txn).await?;
                                stats.band_associations_deduped += 1;
                                continue;
                            }
                        }
                        let mut active: crate::models::albums_bands::ActiveModel = ab.into();
                        active.album_id = Set(Some(target_id));
                        active.update(txn).await?;
                        stats.band_associations_moved += 1;
                    }
                }

                // 4. Move albums_songs associations (dedupe by song_id)
                let existing_song_ids: HashSet<u32> = AlbumSong::find()
                    .filter(AlbumSongColumn::AlbumId.eq(target_id))
                    .all(txn)
                    .await?
                    .into_iter()
                    .map(|as_| as_.song_id)
                    .collect();

                for from_id in &from_ids {
                    let album_songs = AlbumSong::find()
                        .filter(AlbumSongColumn::AlbumId.eq(*from_id))
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
                }

                // 5. Merge albums_sub_genres associations (dedupe by sub_genre_id)
                let existing_sub_genre_ids: HashSet<u32> = AlbumSubGenre::find()
                    .filter(AlbumSubGenreColumn::AlbumId.eq(target_id))
                    .all(txn)
                    .await?
                    .into_iter()
                    .filter_map(|asg| asg.sub_genre_id)
                    .collect();

                for from_id in &from_ids {
                    let album_sub_genres = AlbumSubGenre::find()
                        .filter(AlbumSubGenreColumn::AlbumId.eq(*from_id))
                        .all(txn)
                        .await?;

                    for asg in album_sub_genres {
                        if let Some(sg_id) = asg.sub_genre_id {
                            if existing_sub_genre_ids.contains(&sg_id) {
                                let active: AlbumSubGenreActiveModel = asg.into();
                                active.delete(txn).await?;
                                continue;
                            }
                        }
                        let mut active: AlbumSubGenreActiveModel = asg.into();
                        active.album_id = Set(Some(target_id));
                        active.update(txn).await?;
                        stats.sub_genres_added += 1;
                    }
                }

                // 6. Radio playlists — aggregate spins on composite key match
                {
                    let target_playlists = RadioPlaylist::find()
                        .filter(RadioPlaylistColumn::AlbumId.eq(target_id))
                        .all(txn)
                        .await?;

                    // Build map: (radio_station_id, band_id, song_id) -> (id, spins, subtract_spins)
                    let mut target_map: HashMap<(Option<u32>, Option<u32>, Option<u32>), (u32, i32, i32)> = HashMap::new();
                    for pl in &target_playlists {
                        target_map.insert(
                            (pl.radio_station_id, pl.band_id, pl.song_id),
                            (pl.id, pl.spins, pl.subtract_spins),
                        );
                    }

                    for from_id in &from_ids {
                        let playlists = RadioPlaylist::find()
                            .filter(RadioPlaylistColumn::AlbumId.eq(*from_id))
                            .all(txn)
                            .await?;

                        for pl in playlists {
                            let key = (pl.radio_station_id, pl.band_id, pl.song_id);
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
                                // No match — move to target album
                                let mut active: crate::models::radio_playlists::ActiveModel = pl.into();
                                active.album_id = Set(Some(target_id));
                                active.update(txn).await?;
                                stats.radio_playlists_moved += 1;
                            }
                        }
                    }
                }

                // 7. Radio playlist archives — aggregate spins on composite key match
                {
                    let target_archives = RadioPlaylistArchive::find()
                        .filter(RadioPlaylistArchiveColumn::AlbumId.eq(target_id))
                        .all(txn)
                        .await?;

                    // Key includes week_ending: (radio_station_id, band_id, song_id, week_ending)
                    let mut target_map: HashMap<(Option<u32>, Option<u32>, Option<u32>, Option<chrono::NaiveDate>), (u32, i32, i32)> = HashMap::new();
                    for arch in &target_archives {
                        target_map.insert(
                            (arch.radio_station_id, arch.band_id, arch.song_id, arch.week_ending),
                            (arch.id, arch.spins, arch.subtract_spins),
                        );
                    }

                    for from_id in &from_ids {
                        let archives = RadioPlaylistArchive::find()
                            .filter(RadioPlaylistArchiveColumn::AlbumId.eq(*from_id))
                            .all(txn)
                            .await?;

                        for arch in archives {
                            let key = (arch.radio_station_id, arch.band_id, arch.song_id, arch.week_ending);
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
                                active.album_id = Set(Some(target_id));
                                active.update(txn).await?;
                                stats.radio_playlist_archives_moved += 1;
                            }
                        }
                    }
                }

                // 8. Staff playlists — aggregate spins on composite key match
                {
                    let target_playlists = StaffPlaylist::find()
                        .filter(StaffPlaylistColumn::AlbumId.eq(target_id))
                        .all(txn)
                        .await?;

                    // Key: (staff_member_id, band_id, song_id)
                    let mut target_map: HashMap<(Option<u32>, Option<u32>, Option<u32>), (u32, Option<i32>)> = HashMap::new();
                    for pl in &target_playlists {
                        target_map.insert(
                            (pl.staff_member_id, pl.band_id, pl.song_id),
                            (pl.id, pl.spins),
                        );
                    }

                    for from_id in &from_ids {
                        let playlists = StaffPlaylist::find()
                            .filter(StaffPlaylistColumn::AlbumId.eq(*from_id))
                            .all(txn)
                            .await?;

                        for pl in playlists {
                            let key = (pl.staff_member_id, pl.band_id, pl.song_id);
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
                                active.album_id = Set(Some(target_id));
                                active.update(txn).await?;
                                stats.staff_playlists_moved += 1;
                            }
                        }
                    }
                }

                // 9. Staff playlist archives — aggregate spins on composite key match
                {
                    let target_archives = StaffPlaylistArchive::find()
                        .filter(StaffPlaylistArchiveColumn::AlbumId.eq(target_id))
                        .all(txn)
                        .await?;

                    // Key: (staff_member_id, band_id, song_id, week_ending)
                    let mut target_map: HashMap<(Option<u32>, Option<u32>, Option<u32>, Option<chrono::NaiveDate>), (u32, Option<i32>)> = HashMap::new();
                    for arch in &target_archives {
                        target_map.insert(
                            (arch.staff_member_id, arch.band_id, arch.song_id, arch.week_ending),
                            (arch.id, arch.spins),
                        );
                    }

                    for from_id in &from_ids {
                        let archives = StaffPlaylistArchive::find()
                            .filter(StaffPlaylistArchiveColumn::AlbumId.eq(*from_id))
                            .all(txn)
                            .await?;

                        for arch in archives {
                            let key = (arch.staff_member_id, arch.band_id, arch.song_id, arch.week_ending);
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
                                active.album_id = Set(Some(target_id));
                                active.update(txn).await?;
                                stats.staff_playlist_archives_moved += 1;
                            }
                        }
                    }
                }

                // 10. (Skipped — radio_raw_datas has no album_id column)

                // 11. Move album rankings (move all)
                for from_id in &from_ids {
                    let rankings = AlbumRanking::find()
                        .filter(AlbumRankingColumn::AlbumId.eq(*from_id))
                        .all(txn)
                        .await?;

                    for ranking in rankings {
                        let mut active: crate::models::album_rankings::ActiveModel = ranking.into();
                        active.album_id = Set(Some(target_id));
                        active.update(txn).await?;
                        stats.rankings_moved += 1;
                    }
                }

                // 12. Move album total stats (move all)
                for from_id in &from_ids {
                    let total_stats = AlbumTotalStats::find()
                        .filter(AlbumTotalStatsColumn::AlbumId.eq(*from_id))
                        .all(txn)
                        .await?;

                    for ts in total_stats {
                        let mut active: crate::models::album_total_stats::ActiveModel = ts.into();
                        active.album_id = Set(Some(target_id));
                        active.update(txn).await?;
                        stats.total_stats_moved += 1;
                    }
                }

                // 13. Move album weekly stats (move all)
                for from_id in &from_ids {
                    let weekly_stats = AlbumWeeklyStats::find()
                        .filter(AlbumWeeklyStatsColumn::AlbumId.eq(*from_id))
                        .all(txn)
                        .await?;

                    for ws in weekly_stats {
                        let mut active: crate::models::album_weekly_stats::ActiveModel = ws.into();
                        active.album_id = Set(Some(target_id));
                        active.update(txn).await?;
                        stats.weekly_stats_moved += 1;
                    }
                }

                // 14. Album aliases — dedupe on (band_id, radio_station_id, alias_key)
                {
                    let target_aliases = AlbumAlias::find()
                        .filter(AlbumAliasColumn::AlbumId.eq(target_id))
                        .all(txn)
                        .await?;

                    let existing_alias_keys: HashSet<(u32, Option<u32>, String)> = target_aliases
                        .into_iter()
                        .map(|a| (a.band_id, a.radio_station_id, a.alias_key))
                        .collect();

                    for from_id in &from_ids {
                        let aliases = AlbumAlias::find()
                            .filter(AlbumAliasColumn::AlbumId.eq(*from_id))
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
                                stats.aliases_moved += 1;
                            }
                        }
                    }
                }

                // 15-17. Album duplicate candidates — reassign, remove self-refs, deduplicate pairs
                {
                    for from_id in &from_ids {
                        // Reassign album_id_1 references
                        let candidates_1 = AlbumDuplicateCandidate::find()
                            .filter(AlbumDuplicateCandidateColumn::AlbumId1.eq(*from_id))
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
                            .filter(AlbumDuplicateCandidateColumn::AlbumId2.eq(*from_id))
                            .all(txn)
                            .await?;

                        for cand in candidates_2 {
                            let mut active: crate::models::album_duplicate_candidates::ActiveModel = cand.into();
                            active.album_id_2 = Set(target_id);
                            active.update(txn).await?;
                            stats.duplicate_candidates_updated += 1;
                        }
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

    pub async fn determine_sub_genre_for_charting(
        db: &DatabaseConnection,
        id: u32,
    ) -> Result<GenreUpdateResult, DbErr> {
        db.transaction::<_, GenreUpdateResult, DbErr>(|txn| {
            Box::pin(async move {
                let album = Album::find_by_id(id).one(txn).await?;
                let album = match album {
                    Some(a) => a,
                    None => return Err(DbErr::RecordNotFound("Album not found".into())),
                };

                let songs = album.find_related(crate::models::songs::Entity).all(txn).await?;

                // Sync albums_sub_genres
                let mut all_song_genres = std::collections::HashSet::new();
                for song in &songs {
                    if let Some(sub_genre_id) = song.sub_genre_id {
                        if sub_genre_id != 0 {
                            all_song_genres.insert(sub_genre_id);
                        }
                    }
                }

                // Remove existing associations
                AlbumSubGenre::delete_many()
                    .filter(AlbumSubGenreColumn::AlbumId.eq(id))
                    .exec(txn)
                    .await?;

                if !all_song_genres.is_empty() {
                    let to_add: Vec<AlbumSubGenreActiveModel> = all_song_genres
                        .into_iter()
                        .map(|genre_id| AlbumSubGenreActiveModel {
                            album_id: Set(Some(id)),
                            sub_genre_id: Set(Some(genre_id)),
                            ..Default::default()
                        })
                        .collect();

                    AlbumSubGenre::insert_many(to_add).exec(txn).await?;
                }

                if songs.is_empty() {
                    return Ok(GenreUpdateResult::NoSongs);
                }

                let mut counts = std::collections::HashMap::new();
                for song in &songs {
                    if let Some(sub_genre_id) = song.sub_genre_id {
                        if sub_genre_id != 35 && sub_genre_id != 0 {
                            *counts.entry(sub_genre_id).or_insert(0) += 1;
                        }
                    }
                }

                if counts.is_empty() {
                    return Ok(GenreUpdateResult::NoValidGenres);
                }

                let mut sorted_counts: Vec<_> = counts.iter().collect();
                // Sort by count descending, then by id ascending for stability
                sorted_counts.sort_by(|a, b| b.1.cmp(a.1).then_with(|| a.0.cmp(b.0)));
                let biggest_id = *sorted_counts[0].0;

                let current_id = album.sub_genre_for_charting;
                let is_special_current =
                    current_id.is_none() || current_id == Some(0) || current_id == Some(35);

                if is_special_current {
                    let mut active_model: AlbumActiveModel = album.into();
                    active_model.sub_genre_for_charting = Set(Some(biggest_id));
                    active_model.update(txn).await?;
                    return Ok(GenreUpdateResult::Updated {
                        old_genre_id: current_id,
                        new_genre_id: biggest_id,
                    });
                }

                if current_id == Some(biggest_id) {
                    return Ok(GenreUpdateResult::AlreadyCorrect);
                }

                if album.genre_admin_set == 0 {
                    let mut active_model: AlbumActiveModel = album.into();
                    active_model.sub_genre_for_charting = Set(Some(biggest_id));
                    active_model.update(txn).await?;
                    return Ok(GenreUpdateResult::Updated {
                        old_genre_id: current_id,
                        new_genre_id: biggest_id,
                    });
                }

                Ok(GenreUpdateResult::AdminSetMismatch {
                    current_genre_id: current_id,
                    suggested_genre_id: biggest_id,
                    counts,
                })
            })
        })
        .await
        .map_err(|e| match e {
            TransactionError::Connection(e) => e,
            TransactionError::Transaction(e) => e,
        })
    }

    pub async fn update_all_albums_genres(
        db: &DatabaseConnection,
    ) -> Result<Vec<(u32, GenreUpdateResult)>, DbErr> {
        let albums = Album::find().all(db).await?;
        let mut results = Vec::new();
        for album in albums {
            let res = Self::determine_sub_genre_for_charting(db, album.id).await?;
            results.push((album.id, res));
        }
        Ok(results)
    }

    pub async fn run_album_genre_update_background(
        db: DatabaseConnection,
        progress: Arc<RwLock<TaskJobState>>,
    ) -> Result<(), DbErr> {
        let albums = Album::find().all(&db).await?;
        let total = albums.len() as i32;

        {
            let mut p = progress.write().await;
            p.is_running = true;
            p.total = total;
            p.processed = 0;
            p.overall_progress = 0.0;
            p.last_error = None;
            p.last_started_at = Some(chrono::Utc::now());
            p.last_finished_at = None;
        }

        for album in albums {
            let album_id = album.id;
            let album_name = album.name.clone().unwrap_or_else(|| format!("ID: {}", album_id));

            {
                let mut p = progress.write().await;
                p.current_item = Some(album_name);
            }

            if let Err(e) = Self::determine_sub_genre_for_charting(&db, album_id).await {
                tracing::error!("Failed to update genre for album {}: {}", album_id, e);
                let mut p = progress.write().await;
                p.last_error = Some(format!("Error updating album {}: {}", album_id, e));
            }

            {
                let mut p = progress.write().await;
                p.processed += 1;
                p.overall_progress = (p.processed as f32 / total as f32) * 100.0;
            }
        }

        {
            let mut p = progress.write().await;
            p.is_running = false;
            p.overall_progress = 100.0;
            p.current_item = None;
            p.last_finished_at = Some(chrono::Utc::now());
        }

        Ok(())
    }

    /// Optimized batch processing for updating all album genres.
    /// Processes albums in chunks to minimize database round trips.
    ///
    /// Performance improvement: O(n) queries per album -> O(1) queries per chunk
    /// For 300,000 albums: ~1.2M queries -> ~90 queries (at 20k chunk size)
    ///
    /// Chunk size is configurable via ALBUM_GENRE_CHUNK_SIZE env var (default: 20,000)
    pub async fn run_album_genre_update_background_batched(
        db: DatabaseConnection,
        progress: Arc<RwLock<TaskJobState>>,
    ) -> Result<(), DbErr> {
        let start_time = std::time::Instant::now();
        let chunk_size = get_batch_chunk_size();

        tracing::info!("=== Album Genre Update Job Started ===");
        tracing::info!("Chunk size: {}", chunk_size);

        // Count total albums (process ALL albums - junction table needs sync for all)
        let total_albums = Album::find()
            .count(&db)
            .await? as i32;

        let total_chunks = ((total_albums as u64) + chunk_size - 1) / chunk_size;

        tracing::info!(
            "Processing {} albums in {} chunks",
            total_albums,
            total_chunks
        );

        {
            let mut p = progress.write().await;
            p.is_running = true;
            p.total = total_albums;
            p.processed = 0;
            p.overall_progress = 0.0;
            p.last_error = None;
            p.last_started_at = Some(chrono::Utc::now());
            p.last_finished_at = None;
        }

        for chunk_idx in 0..total_chunks {
            {
                let mut p = progress.write().await;
                p.current_item = Some(format!("Processing chunk {}/{}", chunk_idx + 1, total_chunks));
            }

            if let Err(e) = Self::process_album_genre_chunk(&db, chunk_idx, chunk_size).await {
                tracing::error!("Failed to process album genre chunk {}: {}", chunk_idx, e);
                let mut p = progress.write().await;
                p.last_error = Some(format!("Error processing chunk {}: {}", chunk_idx, e));
                // Continue with next chunk despite error
            }

            {
                let mut p = progress.write().await;
                let processed = std::cmp::min(
                    ((chunk_idx + 1) * chunk_size) as i32,
                    total_albums,
                );
                p.processed = processed;
                p.overall_progress = (processed as f32 / total_albums as f32) * 100.0;
            }
        }

        {
            let mut p = progress.write().await;
            p.is_running = false;
            p.overall_progress = 100.0;
            p.current_item = None;
            p.last_finished_at = Some(chrono::Utc::now());
        }

        let elapsed = start_time.elapsed();
        tracing::info!("=== Album Genre Update Job Completed ===");
        tracing::info!(
            "Processed {} albums in {:.2?}",
            total_albums,
            elapsed
        );

        Ok(())
    }

    /// Process a single chunk of albums for genre updates.
    /// Each chunk performs only ~6 database operations regardless of chunk size.
    async fn process_album_genre_chunk(
        db: &DatabaseConnection,
        chunk_idx: u64,
        chunk_size: u64,
    ) -> Result<(), DbErr> {
        // Query 1: Load chunk of albums (ALL albums - junction table needs sync for all)
        let albums: Vec<AlbumModel> = Album::find()
            .order_by_asc(AlbumColumn::Id)
            .offset(chunk_idx * chunk_size)
            .limit(chunk_size)
            .all(db)
            .await?;

        if albums.is_empty() {
            return Ok(());
        }

        let album_ids: Vec<u32> = albums.iter().map(|a| a.id).collect();

        // Query 2: Load all album_songs junction records for this chunk
        let album_songs: Vec<AlbumSongModel> = AlbumSong::find()
            .filter(AlbumSongColumn::AlbumId.is_in(album_ids.clone()))
            .all(db)
            .await?;

        // Query 3: Load all songs referenced by album_songs
        let song_ids: Vec<u32> = album_songs.iter().map(|as_| as_.song_id).collect();
        let songs: Vec<SongModel> = if song_ids.is_empty() {
            vec![]
        } else {
            Song::find()
                .filter(SongColumn::Id.is_in(song_ids))
                .all(db)
                .await?
        };

        // Build lookup maps in memory
        let songs_by_id: HashMap<u32, &SongModel> = songs.iter().map(|s| (s.id, s)).collect();

        // Map album_id -> Vec<&SongModel>
        let mut songs_by_album: HashMap<u32, Vec<&SongModel>> = HashMap::new();
        for album_song in &album_songs {
            if let Some(song) = songs_by_id.get(&album_song.song_id) {
                songs_by_album
                    .entry(album_song.album_id)
                    .or_default()
                    .push(*song);
            }
        }

        // Compute all genre updates in memory
        let updates: Vec<AlbumGenreComputed> = albums
            .iter()
            .map(|album| {
                let album_songs = songs_by_album
                    .get(&album.id)
                    .map(|v| v.as_slice())
                    .unwrap_or(&[]);
                Self::compute_album_genre_update(album, album_songs)
            })
            .collect();

        let needs_update_count = updates.iter().filter(|u| u.needs_update).count();

        // Query 4: Bulk delete existing album_sub_genres for this chunk
        AlbumSubGenre::delete_many()
            .filter(AlbumSubGenreColumn::AlbumId.is_in(album_ids.clone()))
            .exec(db)
            .await?;

        // Query 5: Bulk insert new album_sub_genres
        let all_inserts: Vec<AlbumSubGenreActiveModel> = updates
            .iter()
            .flat_map(|u| {
                u.sub_genre_ids.iter().map(|&sg_id| AlbumSubGenreActiveModel {
                    album_id: Set(Some(u.album_id)),
                    sub_genre_id: Set(Some(sg_id)),
                    ..Default::default()
                })
            })
            .collect();

        if !all_inserts.is_empty() {
            // Insert in sub-batches to avoid overly large INSERT statements
            for insert_batch in all_inserts.chunks(10000) {
                AlbumSubGenre::insert_many(insert_batch.to_vec())
                    .exec(db)
                    .await?;
            }
        }

        // Query 6+: Bulk update albums, grouped by new genre value
        // This minimizes updates by batching albums with the same target genre
        let mut updates_by_genre: HashMap<Option<u32>, Vec<u32>> = HashMap::new();
        for update in &updates {
            if update.needs_update {
                updates_by_genre
                    .entry(update.new_charting_genre)
                    .or_default()
                    .push(update.album_id);
            }
        }

        for (genre_id, album_ids_for_genre) in &updates_by_genre {
            Album::update_many()
                .col_expr(AlbumColumn::SubGenreForCharting, Expr::value(*genre_id))
                .filter(AlbumColumn::Id.is_in(album_ids_for_genre.clone()))
                .exec(db)
                .await?;

        }

        tracing::info!(
            "Chunk {}: Completed - {} albums, {} need update, {} junction records",
            chunk_idx,
            albums.len(),
            needs_update_count,
            all_inserts.len()
        );

        Ok(())
    }

    /// Compute genre update for a single album based on its songs (in-memory, no DB calls)
    fn compute_album_genre_update(album: &AlbumModel, songs: &[&SongModel]) -> AlbumGenreComputed {
        // Collect all sub_genre_ids from songs for junction table (exclude only 0, keep 35)
        let sub_genre_ids: HashSet<u32> = songs
            .iter()
            .filter_map(|s| s.sub_genre_id)
            .filter(|&id| id != 0)
            .collect();

        // Count occurrences of each sub_genre for charting (exclude both 0 and 35)
        let mut genre_counts: HashMap<u32, usize> = HashMap::new();
        for song in songs {
            if let Some(sub_genre_id) = song.sub_genre_id {
                if sub_genre_id != 0 && sub_genre_id != 35 {
                    *genre_counts.entry(sub_genre_id).or_default() += 1;
                }
            }
        }

        // Find the most common sub_genre
        // Tie-breaker: prefer lower ID for stability (matches original logic)
        let new_charting_genre = genre_counts
            .iter()
            .max_by(|(id_a, count_a), (id_b, count_b)| {
                count_a.cmp(count_b).then_with(|| id_b.cmp(id_a))
            })
            .map(|(&id, _)| id);

        let current = album.sub_genre_for_charting;
        let is_special_current = current.is_none() || current == Some(0) || current == Some(35);

        // Determine if update is needed (matches original determine_sub_genre_for_charting logic)
        let needs_update = if songs.is_empty() || genre_counts.is_empty() {
            // No songs or no valid genres to compute from
            false
        } else if is_special_current {
            // Current is NULL, 0, or 35 -> always update regardless of admin_set
            true
        } else if current == new_charting_genre {
            // Already has the correct value
            false
        } else if album.genre_admin_set == 0 {
            // Admin hasn't locked it, so we can update
            true
        } else {
            // Admin has locked it to a specific value, don't change
            false
        };

        AlbumGenreComputed {
            album_id: album.id,
            new_charting_genre,
            sub_genre_ids,
            needs_update,
        }
    }
}

/// Internal struct for tracking computed genre updates before applying to DB
struct AlbumGenreComputed {
    album_id: u32,
    new_charting_genre: Option<u32>,
    sub_genre_ids: HashSet<u32>,
    needs_update: bool,
}
