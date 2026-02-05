use crate::models::staff_playlists::{
    Entity as StaffPlaylist, Column as StaffPlaylistColumn,
};
use crate::models::staff_playlist_archives::{
    Entity as StaffPlaylistArchive, Column as StaffPlaylistArchiveColumn,
};
use crate::models::staff_members::Entity as StaffMember;
use crate::models::bands::{Entity as Band, Column as BandColumn};
use crate::models::songs::{Entity as Song, Column as SongColumn, Model as SongModel};
use crate::models::albums::{Entity as Album, Column as AlbumColumn};
use crate::models::labels::{Entity as Label, Column as LabelColumn};
use crate::models::sub_genres::{Entity as SubGenre, Column as SubGenreColumn};
use crate::models::band_duplicate_candidates::{
    Entity as BandDuplicateCandidate, Column as BandDuplicateCandidateColumn,
};
use crate::models::song_duplicate_candidates::{
    Entity as SongDuplicateCandidate, Column as SongDuplicateCandidateColumn,
};
use crate::models::album_duplicate_candidates::{
    Entity as AlbumDuplicateCandidate, Column as AlbumDuplicateCandidateColumn,
};
use crate::services::types::{PaginatedResponse, PaginationInfo};
use sea_orm::*;
use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};
use std::collections::HashMap;

#[derive(Debug, Serialize, ToSchema, Clone)]
pub struct PlaylistEntryResponse {
    pub id: u32,
    pub staff_member_id: Option<u32>,
    pub band_id: Option<u32>,
    pub band_name: Option<String>,
    pub album_id: Option<u32>,
    pub album_name: Option<String>,
    pub song_id: Option<u32>,
    pub song_name: Option<String>,
    pub label_id: Option<u32>,
    pub label_name: Option<String>,
    pub sub_genre_id: Option<u32>,
    pub sub_genre_name: Option<String>,
    pub spins: Option<i32>,
    pub invalid: i8,
    pub created: Option<String>,
    pub modified: Option<String>,
}

#[derive(Debug, Serialize, ToSchema, Clone)]
pub struct ArchiveEntryResponse {
    pub id: u32,
    pub staff_member_id: Option<u32>,
    pub band_id: Option<u32>,
    pub band_name: Option<String>,
    pub album_id: Option<u32>,
    pub album_name: Option<String>,
    pub song_id: Option<u32>,
    pub song_name: Option<String>,
    pub label_id: Option<u32>,
    pub label_name: Option<String>,
    pub sub_genre_id: Option<u32>,
    pub sub_genre_name: Option<String>,
    pub spins: Option<i32>,
    pub invalid: i8,
    pub week_ending: Option<String>,
    pub created: Option<String>,
    pub modified: Option<String>,
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct PlaylistFilterParams {
    pub staff_member_id: u32,
    pub page: Option<u64>,
    pub page_size: Option<u64>,
    pub band_name: Option<String>,
    pub song_name: Option<String>,
    pub sort_field: Option<String>,
    pub sort_ascending: Option<bool>,
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct ArchiveFilterParams {
    pub staff_member_id: u32,
    pub week_ending: Option<String>,
    pub page: Option<u64>,
    pub page_size: Option<u64>,
    pub band_name: Option<String>,
    pub song_name: Option<String>,
    pub sort_field: Option<String>,
    pub sort_ascending: Option<bool>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreatePlaylistEntryRequest {
    pub staff_member_id: u32,
    pub band_id: u32,
    pub song_id: u32,
    pub album_id: Option<u32>,
    pub spins: Option<i32>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct UpdateSpinsRequest {
    pub spins: Option<i32>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct BulkUpdateSpinsEntry {
    pub id: u32,
    pub spins: Option<i32>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct BulkUpdateSpinsRequest {
    pub updates: Vec<BulkUpdateSpinsEntry>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct DeleteEntriesRequest {
    pub ids: Vec<u32>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct AddSpinsRequest {
    pub additional_spins: i32,
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct CheckDuplicateParams {
    pub staff_member_id: u32,
    pub band_id: u32,
    pub song_id: u32,
    pub album_id: Option<u32>,
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct DuplicateWarningParams {
    pub band_id: Option<u32>,
    pub song_id: Option<u32>,
    pub album_id: Option<u32>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct DuplicateWarning {
    pub entity_type: String,
    pub entity_id: u32,
    pub pending_count: u64,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct ImportFromArchiveRequest {
    pub staff_member_id: u32,
    pub week_ending: Option<String>,
    pub with_spins: bool,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ImportResult {
    pub imported_count: u32,
    pub skipped_count: u32,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ArchiveWeek {
    pub week_ending: String,
}

pub struct StaffPlaylistService;

impl StaffPlaylistService {
    pub async fn get_playlist_entries(
        db: &DatabaseConnection,
        params: PlaylistFilterParams,
    ) -> Result<PaginatedResponse<PlaylistEntryResponse>, DbErr> {
        let page = params.page.unwrap_or(1);
        let page_size = params.page_size.unwrap_or(500).clamp(1, 1000);

        let mut query = StaffPlaylist::find()
            .filter(StaffPlaylistColumn::StaffMemberId.eq(params.staff_member_id));

        // Apply sorting
        if let Some(sort_field) = &params.sort_field {
            let order = if params.sort_ascending.unwrap_or(true) {
                Order::Asc
            } else {
                Order::Desc
            };
            match sort_field.as_str() {
                "spins" => query = query.order_by(StaffPlaylistColumn::Spins, order),
                "created" => query = query.order_by(StaffPlaylistColumn::Created, order),
                _ => query = query.order_by(StaffPlaylistColumn::Id, order),
            }
        } else {
            query = query.order_by_desc(StaffPlaylistColumn::Id);
        }

        let paginator = query.paginate(db, page_size);
        let total_items = paginator.num_items().await?;
        let total_pages = paginator.num_pages().await?;

        let entries = paginator.fetch_page(page - 1).await?;
        let mut results = Self::enrich_playlist_entries(db, &entries).await?;

        // Apply name filters after enrichment (post-filter since we join in memory)
        if let Some(band_name) = &params.band_name {
            let lower = band_name.to_lowercase();
            results.retain(|r| {
                r.band_name
                    .as_ref()
                    .map(|n| n.to_lowercase().contains(&lower))
                    .unwrap_or(false)
            });
        }
        if let Some(song_name) = &params.song_name {
            let lower = song_name.to_lowercase();
            results.retain(|r| {
                r.song_name
                    .as_ref()
                    .map(|n| n.to_lowercase().contains(&lower))
                    .unwrap_or(false)
            });
        }

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

    pub async fn create_entry(
        db: &DatabaseConnection,
        data: CreatePlaylistEntryRequest,
    ) -> Result<PlaylistEntryResponse, DbErr> {
        let active_model = crate::models::staff_playlists::ActiveModel {
            staff_member_id: Set(Some(data.staff_member_id)),
            band_id: Set(Some(data.band_id)),
            song_id: Set(Some(data.song_id)),
            album_id: Set(data.album_id),
            spins: Set(data.spins),
            ..Default::default()
        };

        let entry = active_model.insert(db).await?;
        let results = Self::enrich_playlist_entries(db, &[entry]).await?;
        Ok(results.into_iter().next().unwrap())
    }

    pub async fn update_spins(
        db: &DatabaseConnection,
        entry_id: u32,
        spins: Option<i32>,
    ) -> Result<PlaylistEntryResponse, DbErr> {
        let entry = StaffPlaylist::find_by_id(entry_id)
            .one(db)
            .await?
            .ok_or(DbErr::RecordNotFound(
                "Playlist entry not found".to_string(),
            ))?;

        let mut active: crate::models::staff_playlists::ActiveModel = entry.into();
        active.spins = Set(spins);
        let updated = active.update(db).await?;

        let results = Self::enrich_playlist_entries(db, &[updated]).await?;
        Ok(results.into_iter().next().unwrap())
    }

    pub async fn bulk_update_spins(
        db: &DatabaseConnection,
        updates: Vec<BulkUpdateSpinsEntry>,
    ) -> Result<u32, DbErr> {
        let mut count = 0u32;
        for update in updates {
            let entry = StaffPlaylist::find_by_id(update.id).one(db).await?;
            if let Some(entry) = entry {
                let mut active: crate::models::staff_playlists::ActiveModel = entry.into();
                active.spins = Set(update.spins);
                active.update(db).await?;
                count += 1;
            }
        }
        Ok(count)
    }

    pub async fn delete_entries(
        db: &DatabaseConnection,
        ids: Vec<u32>,
    ) -> Result<u64, DbErr> {
        if ids.is_empty() {
            return Ok(0);
        }
        let result = StaffPlaylist::delete_many()
            .filter(StaffPlaylistColumn::Id.is_in(ids))
            .exec(db)
            .await?;
        Ok(result.rows_affected)
    }

    pub async fn delete_all_entries(
        db: &DatabaseConnection,
        staff_member_id: u32,
    ) -> Result<u64, DbErr> {
        let result = StaffPlaylist::delete_many()
            .filter(StaffPlaylistColumn::StaffMemberId.eq(staff_member_id))
            .exec(db)
            .await?;
        Ok(result.rows_affected)
    }

    pub async fn check_duplicate(
        db: &DatabaseConnection,
        params: CheckDuplicateParams,
    ) -> Result<Option<PlaylistEntryResponse>, DbErr> {
        let mut query = StaffPlaylist::find()
            .filter(StaffPlaylistColumn::StaffMemberId.eq(params.staff_member_id))
            .filter(StaffPlaylistColumn::BandId.eq(params.band_id))
            .filter(StaffPlaylistColumn::SongId.eq(params.song_id));

        if let Some(album_id) = params.album_id {
            query = query.filter(StaffPlaylistColumn::AlbumId.eq(album_id));
        } else {
            query = query.filter(StaffPlaylistColumn::AlbumId.is_null());
        }

        let entry = query.one(db).await?;
        match entry {
            Some(entry) => {
                let results = Self::enrich_playlist_entries(db, &[entry]).await?;
                Ok(results.into_iter().next())
            }
            None => Ok(None),
        }
    }

    pub async fn get_entity_duplicate_warnings(
        db: &DatabaseConnection,
        params: DuplicateWarningParams,
    ) -> Result<Vec<DuplicateWarning>, DbErr> {
        let mut warnings = Vec::new();

        if let Some(band_id) = params.band_id {
            let count = BandDuplicateCandidate::find()
                .filter(
                    Condition::any()
                        .add(BandDuplicateCandidateColumn::BandId1.eq(band_id))
                        .add(BandDuplicateCandidateColumn::BandId2.eq(band_id)),
                )
                .filter(BandDuplicateCandidateColumn::Status.eq("pending"))
                .count(db)
                .await?;

            if count > 0 {
                warnings.push(DuplicateWarning {
                    entity_type: "band".to_string(),
                    entity_id: band_id,
                    pending_count: count,
                });
            }
        }

        if let Some(song_id) = params.song_id {
            let count = SongDuplicateCandidate::find()
                .filter(
                    Condition::any()
                        .add(SongDuplicateCandidateColumn::SongId1.eq(song_id))
                        .add(SongDuplicateCandidateColumn::SongId2.eq(song_id)),
                )
                .filter(SongDuplicateCandidateColumn::Status.eq("pending"))
                .count(db)
                .await?;

            if count > 0 {
                warnings.push(DuplicateWarning {
                    entity_type: "song".to_string(),
                    entity_id: song_id,
                    pending_count: count,
                });
            }
        }

        if let Some(album_id) = params.album_id {
            let count = AlbumDuplicateCandidate::find()
                .filter(
                    Condition::any()
                        .add(AlbumDuplicateCandidateColumn::AlbumId1.eq(album_id))
                        .add(AlbumDuplicateCandidateColumn::AlbumId2.eq(album_id)),
                )
                .filter(AlbumDuplicateCandidateColumn::Status.eq("pending"))
                .count(db)
                .await?;

            if count > 0 {
                warnings.push(DuplicateWarning {
                    entity_type: "album".to_string(),
                    entity_id: album_id,
                    pending_count: count,
                });
            }
        }

        Ok(warnings)
    }

    pub async fn add_spins_to_existing(
        db: &DatabaseConnection,
        entry_id: u32,
        additional_spins: i32,
    ) -> Result<PlaylistEntryResponse, DbErr> {
        let entry = StaffPlaylist::find_by_id(entry_id)
            .one(db)
            .await?
            .ok_or(DbErr::RecordNotFound(
                "Playlist entry not found".to_string(),
            ))?;

        let current_spins = entry.spins.unwrap_or(0);
        let mut active: crate::models::staff_playlists::ActiveModel = entry.into();
        active.spins = Set(Some(current_spins + additional_spins));
        let updated = active.update(db).await?;

        let results = Self::enrich_playlist_entries(db, &[updated]).await?;
        Ok(results.into_iter().next().unwrap())
    }

    pub async fn import_from_archive(
        db: &DatabaseConnection,
        req: ImportFromArchiveRequest,
    ) -> Result<ImportResult, DbErr> {
        let mut query = StaffPlaylistArchive::find()
            .filter(StaffPlaylistArchiveColumn::StaffMemberId.eq(req.staff_member_id));

        if let Some(week_ending_str) = &req.week_ending
            && let Ok(date) = chrono::NaiveDate::parse_from_str(week_ending_str, "%Y-%m-%d") {
                query = query.filter(StaffPlaylistArchiveColumn::WeekEnding.eq(date));
            }

        let archives = query.all(db).await?;

        // Load existing entries to skip duplicates
        let existing = StaffPlaylist::find()
            .filter(StaffPlaylistColumn::StaffMemberId.eq(req.staff_member_id))
            .all(db)
            .await?;

        let existing_keys: std::collections::HashSet<(Option<u32>, Option<u32>, Option<u32>)> =
            existing
                .iter()
                .map(|e| (e.band_id, e.song_id, e.album_id))
                .collect();

        let mut imported = 0u32;
        let mut skipped = 0u32;

        for arch in archives {
            let key = (arch.band_id, arch.song_id, arch.album_id);
            if existing_keys.contains(&key) {
                skipped += 1;
                continue;
            }

            let spins = if req.with_spins { arch.spins } else { None };

            let active = crate::models::staff_playlists::ActiveModel {
                staff_member_id: Set(arch.staff_member_id),
                band_id: Set(arch.band_id),
                song_id: Set(arch.song_id),
                album_id: Set(arch.album_id),
                user_id: Set(arch.user_id),
                spins: Set(spins),
                ..Default::default()
            };
            active.insert(db).await?;
            imported += 1;
        }

        Ok(ImportResult {
            imported_count: imported,
            skipped_count: skipped,
        })
    }

    pub async fn get_archive_weeks(
        db: &DatabaseConnection,
        staff_member_id: u32,
    ) -> Result<Vec<ArchiveWeek>, DbErr> {
        // Use raw query for DISTINCT week_ending
        let entries = StaffPlaylistArchive::find()
            .filter(StaffPlaylistArchiveColumn::StaffMemberId.eq(staff_member_id))
            .filter(StaffPlaylistArchiveColumn::WeekEnding.is_not_null())
            .all(db)
            .await?;

        let mut weeks: Vec<chrono::NaiveDate> = entries
            .iter()
            .filter_map(|e| e.week_ending)
            .collect::<std::collections::HashSet<_>>()
            .into_iter()
            .collect();

        weeks.sort_by(|a, b| b.cmp(a)); // descending

        Ok(weeks
            .into_iter()
            .map(|w| ArchiveWeek {
                week_ending: w.format("%Y-%m-%d").to_string(),
            })
            .collect())
    }

    pub async fn get_archive_entries(
        db: &DatabaseConnection,
        params: ArchiveFilterParams,
    ) -> Result<PaginatedResponse<ArchiveEntryResponse>, DbErr> {
        let page = params.page.unwrap_or(1);
        let page_size = params.page_size.unwrap_or(500).clamp(1, 1000);

        let mut query = StaffPlaylistArchive::find()
            .filter(StaffPlaylistArchiveColumn::StaffMemberId.eq(params.staff_member_id));

        if let Some(week_ending_str) = &params.week_ending
            && let Ok(date) = chrono::NaiveDate::parse_from_str(week_ending_str, "%Y-%m-%d") {
                query = query.filter(StaffPlaylistArchiveColumn::WeekEnding.eq(date));
            }

        // Apply sorting
        if let Some(sort_field) = &params.sort_field {
            let order = if params.sort_ascending.unwrap_or(true) {
                Order::Asc
            } else {
                Order::Desc
            };
            match sort_field.as_str() {
                "spins" => query = query.order_by(StaffPlaylistArchiveColumn::Spins, order),
                "week_ending" => {
                    query = query.order_by(StaffPlaylistArchiveColumn::WeekEnding, order)
                }
                _ => query = query.order_by(StaffPlaylistArchiveColumn::Id, order),
            }
        } else {
            query = query.order_by_desc(StaffPlaylistArchiveColumn::Id);
        }

        let paginator = query.paginate(db, page_size);
        let total_items = paginator.num_items().await?;
        let total_pages = paginator.num_pages().await?;

        let entries = paginator.fetch_page(page - 1).await?;
        let results = Self::enrich_archive_entries(db, &entries).await?;

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

    pub async fn finalise_playlist(
        db: &DatabaseConnection,
        staff_member_id: u32,
    ) -> Result<(), DbErr> {
        let staff = StaffMember::find_by_id(staff_member_id)
            .one(db)
            .await?
            .ok_or(DbErr::RecordNotFound(
                "Staff member not found".to_string(),
            ))?;

        let mut active: crate::models::staff_members::ActiveModel = staff.into();
        active.playlist_finalised = Set(1);
        active.reported = Set(1);
        active.has_playlist = Set(1);
        active.last_reported = Set(Some(chrono::Local::now().date_naive()));
        active.update(db).await?;
        Ok(())
    }

    pub async fn unlock_playlist(
        db: &DatabaseConnection,
        staff_member_id: u32,
    ) -> Result<(), DbErr> {
        let staff = StaffMember::find_by_id(staff_member_id)
            .one(db)
            .await?
            .ok_or(DbErr::RecordNotFound(
                "Staff member not found".to_string(),
            ))?;

        let mut active: crate::models::staff_members::ActiveModel = staff.into();
        active.playlist_finalised = Set(0);
        active.update(db).await?;
        Ok(())
    }

    // --- Private helpers ---

    async fn enrich_playlist_entries(
        db: &DatabaseConnection,
        entries: &[crate::models::staff_playlists::Model],
    ) -> Result<Vec<PlaylistEntryResponse>, DbErr> {
        if entries.is_empty() {
            return Ok(vec![]);
        }

        // Collect IDs for batch loading
        let band_ids: Vec<u32> = entries.iter().filter_map(|e| e.band_id).collect();
        let song_ids: Vec<u32> = entries.iter().filter_map(|e| e.song_id).collect();
        let album_ids: Vec<u32> = entries.iter().filter_map(|e| e.album_id).collect();

        // Batch load data
        let band_names = Self::load_band_names(db, &band_ids).await?;
        let songs = Self::load_songs(db, &song_ids).await?;
        let (album_names, album_label_ids) = Self::load_album_info(db, &album_ids).await?;

        // Load label names from album label_ids
        let label_ids: Vec<u32> = album_label_ids.values().copied().collect();
        let label_names = Self::load_label_names(db, &label_ids).await?;

        // Collect sub_genre_ids from songs and load names
        let sub_genre_ids: Vec<u32> = songs
            .values()
            .filter_map(|s| s.sub_genre_id)
            .collect();
        let sub_genre_names = Self::load_sub_genre_names(db, &sub_genre_ids).await?;

        Ok(entries
            .iter()
            .map(|entry| {
                let label_id = entry
                    .album_id
                    .and_then(|aid| album_label_ids.get(&aid).copied());
                let label_name = label_id.and_then(|lid| label_names.get(&lid).cloned());

                // Get song and sub_genre info
                let song = entry.song_id.and_then(|id| songs.get(&id));
                let song_name = song.and_then(|s| s.name.clone());
                let sub_genre_id = song.and_then(|s| s.sub_genre_id);
                let sub_genre_name = sub_genre_id.and_then(|id| sub_genre_names.get(&id).cloned());

                PlaylistEntryResponse {
                    id: entry.id,
                    staff_member_id: entry.staff_member_id,
                    band_id: entry.band_id,
                    band_name: entry.band_id.and_then(|id| band_names.get(&id).cloned()),
                    album_id: entry.album_id,
                    album_name: entry
                        .album_id
                        .and_then(|id| album_names.get(&id).cloned()),
                    song_id: entry.song_id,
                    song_name,
                    label_id,
                    label_name,
                    sub_genre_id,
                    sub_genre_name,
                    spins: entry.spins,
                    invalid: entry.invalid,
                    created: entry.created.map(|d| d.to_string()),
                    modified: entry.modified.map(|d| d.to_string()),
                }
            })
            .collect())
    }

    async fn enrich_archive_entries(
        db: &DatabaseConnection,
        entries: &[crate::models::staff_playlist_archives::Model],
    ) -> Result<Vec<ArchiveEntryResponse>, DbErr> {
        if entries.is_empty() {
            return Ok(vec![]);
        }

        let band_ids: Vec<u32> = entries.iter().filter_map(|e| e.band_id).collect();
        let song_ids: Vec<u32> = entries.iter().filter_map(|e| e.song_id).collect();
        let album_ids: Vec<u32> = entries.iter().filter_map(|e| e.album_id).collect();

        let band_names = Self::load_band_names(db, &band_ids).await?;
        let songs = Self::load_songs(db, &song_ids).await?;
        let (album_names, album_label_ids) = Self::load_album_info(db, &album_ids).await?;
        let label_ids: Vec<u32> = album_label_ids.values().copied().collect();
        let label_names = Self::load_label_names(db, &label_ids).await?;

        // Collect sub_genre_ids from songs and load names
        let sub_genre_ids: Vec<u32> = songs
            .values()
            .filter_map(|s| s.sub_genre_id)
            .collect();
        let sub_genre_names = Self::load_sub_genre_names(db, &sub_genre_ids).await?;

        Ok(entries
            .iter()
            .map(|entry| {
                let label_id = entry
                    .album_id
                    .and_then(|aid| album_label_ids.get(&aid).copied());
                let label_name = label_id.and_then(|lid| label_names.get(&lid).cloned());

                // Get song and sub_genre info
                let song = entry.song_id.and_then(|id| songs.get(&id));
                let song_name = song.and_then(|s| s.name.clone());
                let sub_genre_id = song.and_then(|s| s.sub_genre_id);
                let sub_genre_name = sub_genre_id.and_then(|id| sub_genre_names.get(&id).cloned());

                ArchiveEntryResponse {
                    id: entry.id,
                    staff_member_id: entry.staff_member_id,
                    band_id: entry.band_id,
                    band_name: entry.band_id.and_then(|id| band_names.get(&id).cloned()),
                    album_id: entry.album_id,
                    album_name: entry
                        .album_id
                        .and_then(|id| album_names.get(&id).cloned()),
                    song_id: entry.song_id,
                    song_name,
                    label_id,
                    label_name,
                    sub_genre_id,
                    sub_genre_name,
                    spins: entry.spins,
                    invalid: entry.invalid,
                    week_ending: entry.week_ending.map(|d| d.format("%Y-%m-%d").to_string()),
                    created: entry.created.map(|d| d.to_string()),
                    modified: entry.modified.map(|d| d.to_string()),
                }
            })
            .collect())
    }

    async fn load_band_names(
        db: &DatabaseConnection,
        ids: &[u32],
    ) -> Result<HashMap<u32, String>, DbErr> {
        if ids.is_empty() {
            return Ok(HashMap::new());
        }
        let bands = Band::find()
            .filter(BandColumn::Id.is_in(ids.to_vec()))
            .all(db)
            .await?;
        Ok(bands.into_iter().map(|b| (b.id, b.name)).collect())
    }

    async fn load_songs(
        db: &DatabaseConnection,
        ids: &[u32],
    ) -> Result<HashMap<u32, SongModel>, DbErr> {
        if ids.is_empty() {
            return Ok(HashMap::new());
        }
        let songs = Song::find()
            .filter(SongColumn::Id.is_in(ids.to_vec()))
            .all(db)
            .await?;
        Ok(songs.into_iter().map(|s| (s.id, s)).collect())
    }

    async fn load_sub_genre_names(
        db: &DatabaseConnection,
        ids: &[u32],
    ) -> Result<HashMap<u32, String>, DbErr> {
        if ids.is_empty() {
            return Ok(HashMap::new());
        }
        let sub_genres = SubGenre::find()
            .filter(SubGenreColumn::Id.is_in(ids.to_vec()))
            .all(db)
            .await?;
        Ok(sub_genres
            .into_iter()
            .filter_map(|sg| sg.name.map(|n| (sg.id, n)))
            .collect())
    }

    async fn load_album_info(
        db: &DatabaseConnection,
        ids: &[u32],
    ) -> Result<(HashMap<u32, String>, HashMap<u32, u32>), DbErr> {
        if ids.is_empty() {
            return Ok((HashMap::new(), HashMap::new()));
        }
        let albums = Album::find()
            .filter(AlbumColumn::Id.is_in(ids.to_vec()))
            .all(db)
            .await?;
        let names: HashMap<u32, String> = albums
            .iter()
            .filter_map(|a| a.name.clone().map(|n| (a.id, n)))
            .collect();
        let label_ids: HashMap<u32, u32> = albums
            .iter()
            .filter_map(|a| a.label_id.map(|lid| (a.id, lid)))
            .collect();
        Ok((names, label_ids))
    }

    async fn load_label_names(
        db: &DatabaseConnection,
        ids: &[u32],
    ) -> Result<HashMap<u32, String>, DbErr> {
        if ids.is_empty() {
            return Ok(HashMap::new());
        }
        let labels = Label::find()
            .filter(LabelColumn::Id.is_in(ids.to_vec()))
            .all(db)
            .await?;
        Ok(labels
            .into_iter()
            .filter_map(|l| l.name.map(|n| (l.id, n)))
            .collect())
    }
}
