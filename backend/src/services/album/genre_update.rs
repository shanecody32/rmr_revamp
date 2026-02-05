//! Album genre calculation and update operations.

use crate::models::albums::{Entity as Album, Model as AlbumModel, ActiveModel as AlbumActiveModel, Column as AlbumColumn};
use crate::models::songs::{Entity as Song, Model as SongModel, Column as SongColumn};
use crate::models::albums_songs::{Entity as AlbumSong, Model as AlbumSongModel, Column as AlbumSongColumn};
use crate::models::albums_sub_genres::{Entity as AlbumSubGenre, Column as AlbumSubGenreColumn, ActiveModel as AlbumSubGenreActiveModel};
use crate::job_state::TaskJobState;
use super::types::{GenreUpdateResult, AlbumGenreComputed, get_batch_chunk_size};
use sea_orm::*;
use sea_orm::prelude::Expr;
use std::sync::Arc;
use std::collections::{HashMap, HashSet};
use tokio::sync::RwLock;

/// Determine and update the sub_genre_for_charting for a single album.
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
                if let Some(sub_genre_id) = song.sub_genre_id
                    && sub_genre_id != 0 {
                        all_song_genres.insert(sub_genre_id);
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

                AlbumSubGenre::insert_many(to_add).exec_without_returning(txn).await?;
            }

            if songs.is_empty() {
                return Ok(GenreUpdateResult::NoSongs);
            }

            let mut counts = std::collections::HashMap::new();
            for song in &songs {
                if let Some(sub_genre_id) = song.sub_genre_id
                    && sub_genre_id != 35 && sub_genre_id != 0 {
                        *counts.entry(sub_genre_id).or_insert(0) += 1;
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

/// Update all albums' genres (non-batched version).
pub async fn update_all_albums_genres(
    db: &DatabaseConnection,
) -> Result<Vec<(u32, GenreUpdateResult)>, DbErr> {
    let albums = Album::find().all(db).await?;
    let mut results = Vec::new();
    for album in albums {
        let res = determine_sub_genre_for_charting(db, album.id).await?;
        results.push((album.id, res));
    }
    Ok(results)
}

/// Run album genre update as a background job (non-batched).
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

        if let Err(e) = determine_sub_genre_for_charting(&db, album_id).await {
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

    let total_chunks = (total_albums as u64).div_ceil(chunk_size);

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

        if let Err(e) = process_album_genre_chunk(&db, chunk_idx, chunk_size).await {
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
            compute_album_genre_update(album, album_songs)
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
                .exec_without_returning(db)
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
        if let Some(sub_genre_id) = song.sub_genre_id
            && sub_genre_id != 0 && sub_genre_id != 35 {
                *genre_counts.entry(sub_genre_id).or_default() += 1;
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
