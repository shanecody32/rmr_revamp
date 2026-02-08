//! Tests for transfer service operations (song ↔ album, song ↔ band, album ↔ band).
//!
//! Uses SeaORM's MockDatabase to verify the transfer pipelines without hitting
//! a real database. MockDatabase shares a single FIFO queue between the outer
//! connection and any transaction created from it.
//!
//! Mock result rules:
//! - `Entity::find_by_id().one()` / `Entity::find().all()` → 1 query result
//! - `update_many().exec()` / `delete_many().exec()` → 1 exec result
//! - `delete_by_id().exec()` → 1 exec result (no select-back)
//! - `active_model.insert()` → 1 exec + 1 query (select-back)

mod common;

use sea_orm::{DatabaseBackend, DbErr, MockDatabase, MockExecResult};

use backend::models::{
    albums::Model as AlbumModel,
    albums_bands::Model as AlbumsBandsModel,
    albums_songs::Model as AlbumsSongsModel,
    bands::Model as BandModel,
    songs::Model as SongModel,
};
use backend::services::transfer_service::TransferService;

// ─── Fixture helpers ────────────────────────────────────────────

fn make_test_albums_songs(id: u32, album_id: u32, song_id: u32) -> AlbumsSongsModel {
    AlbumsSongsModel {
        id,
        album_id,
        song_id,
        track_num: None,
        disc_count: None,
        disc_number: None,
        track_count: None,
        track_number: None,
    }
}

fn make_test_albums_bands(id: u32, album_id: u32, band_id: u32) -> AlbumsBandsModel {
    AlbumsBandsModel {
        id,
        album_id: Some(album_id),
        band_id: Some(band_id),
    }
}

fn exec(rows_affected: u64) -> MockExecResult {
    MockExecResult {
        last_insert_id: 0,
        rows_affected,
    }
}

fn exec_insert(last_insert_id: u64) -> MockExecResult {
    MockExecResult {
        last_insert_id,
        rows_affected: 1,
    }
}

// ─── Error Tests ────────────────────────────────────────────────

mod error_tests {
    use super::*;

    #[tokio::test]
    async fn transfer_song_to_album_song_not_found() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_query_results(vec![Vec::<SongModel>::new()])
            .into_connection();

        let result = TransferService::transfer_song_to_album(&db, 99, 1, None, None).await;
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(
            matches!(err, DbErr::Custom(ref msg) if msg.contains("Song 99 not found")),
            "Expected Custom error about song not found, got: {err:?}"
        );
    }

    #[tokio::test]
    async fn transfer_song_to_album_album_not_found() {
        let song = common::make_test_song(1, 10, "Test Song");
        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_query_results(vec![vec![song]])
            .append_query_results(vec![Vec::<AlbumModel>::new()])
            .into_connection();

        let result = TransferService::transfer_song_to_album(&db, 1, 99, None, None).await;
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(
            matches!(err, DbErr::Custom(ref msg) if msg.contains("Album 99 not found")),
            "Expected Custom error about album not found, got: {err:?}"
        );
    }

    #[tokio::test]
    async fn transfer_song_to_band_song_not_found() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_query_results(vec![Vec::<SongModel>::new()])
            .into_connection();

        let result = TransferService::transfer_song_to_band(&db, 99, 1, None, None).await;
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(
            matches!(err, DbErr::Custom(ref msg) if msg.contains("Song 99 not found")),
            "Expected Custom error about song not found, got: {err:?}"
        );
    }

    #[tokio::test]
    async fn transfer_song_to_band_band_not_found() {
        let song = common::make_test_song(1, 10, "Test Song");
        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_query_results(vec![vec![song]])
            .append_query_results(vec![Vec::<BandModel>::new()])
            .into_connection();

        let result = TransferService::transfer_song_to_band(&db, 1, 99, None, None).await;
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(
            matches!(err, DbErr::Custom(ref msg) if msg.contains("Band 99 not found")),
            "Expected Custom error about band not found, got: {err:?}"
        );
    }

    #[tokio::test]
    async fn remove_song_from_album_not_on_album() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_query_results(vec![Vec::<AlbumsSongsModel>::new()])
            .into_connection();

        let result = TransferService::remove_song_from_album(&db, 1, 99, None, None).await;
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(
            matches!(err, DbErr::Custom(ref msg) if msg.contains("Song is not on this album")),
            "Expected Custom error about song not on album, got: {err:?}"
        );
    }

    #[tokio::test]
    async fn transfer_album_to_band_album_not_found() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_query_results(vec![Vec::<AlbumModel>::new()])
            .into_connection();

        let result =
            TransferService::transfer_album_to_band(&db, 99, 1, false, None, None).await;
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(
            matches!(err, DbErr::Custom(ref msg) if msg.contains("Album 99 not found")),
            "Expected Custom error about album not found, got: {err:?}"
        );
    }

    #[tokio::test]
    async fn transfer_album_to_band_band_not_found() {
        let album = common::make_test_album(1, "Test Album");
        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_query_results(vec![vec![album]])
            .append_query_results(vec![Vec::<BandModel>::new()])
            .into_connection();

        let result =
            TransferService::transfer_album_to_band(&db, 1, 99, false, None, None).await;
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(
            matches!(err, DbErr::Custom(ref msg) if msg.contains("Band 99 not found")),
            "Expected Custom error about band not found, got: {err:?}"
        );
    }
}

// ─── Remove Song From Album Tests ──────────────────────────────

mod remove_song_tests {
    use super::*;

    /// Build a MockDatabase for a successful remove_song_from_album call.
    ///
    /// DB operation sequence:
    ///   Q1: albums_songs find one (verify association exists)
    ///   -- begin txn --
    ///   E1: delete_by_id junction row
    ///   E2: update_many album data_status
    ///   -- commit txn --
    ///   E3: insert action_log (exec)
    ///   Q2: insert action_log (select-back)
    fn build_remove_song_db() -> sea_orm::DatabaseConnection {
        let assoc = make_test_albums_songs(50, 10, 1);
        let action_log = common::make_test_action_log(1, "song.remove_from_album", "song", 1);

        MockDatabase::new(DatabaseBackend::MySql)
            // Q1: find association
            .append_query_results(vec![vec![assoc]])
            // E1: delete_by_id junction
            .append_exec_results(vec![exec(1)])
            // E2: update_many album status
            .append_exec_results(vec![exec(1)])
            // E3: insert action_log (exec part)
            .append_exec_results(vec![exec_insert(1)])
            // Q2: insert action_log (select-back)
            .append_query_results(vec![vec![action_log]])
            .into_connection()
    }

    #[tokio::test]
    async fn remove_song_from_album_success() {
        let db = build_remove_song_db();
        let result = TransferService::remove_song_from_album(&db, 1, 10, None, None).await;
        assert!(result.is_ok(), "remove_song_from_album failed: {:?}", result.err());

        let tr = result.unwrap();
        assert!(tr.success);
    }

    #[tokio::test]
    async fn remove_song_from_album_message() {
        let db = build_remove_song_db();
        let result = TransferService::remove_song_from_album(&db, 1, 10, None, None)
            .await
            .unwrap();
        assert_eq!(result.message, "Song removed from album");
    }

    #[tokio::test]
    async fn remove_song_from_album_counts() {
        let db = build_remove_song_db();
        let result = TransferService::remove_song_from_album(&db, 1, 10, None, None)
            .await
            .unwrap();

        assert_eq!(result.affected.albums_songs, 1);
        // All other counts should be zero
        assert_eq!(result.affected.staff_playlists, 0);
        assert_eq!(result.affected.staff_playlist_archives, 0);
        assert_eq!(result.affected.radio_playlists, 0);
        assert_eq!(result.affected.radio_playlist_archives, 0);
        assert_eq!(result.affected.radio_raw_datas, 0);
        assert_eq!(result.affected.song_aliases, 0);
        assert_eq!(result.affected.songs, 0);
    }
}

// ─── Song To Album Transfer Tests ──────────────────────────────

mod song_to_album_tests {
    use super::*;

    /// Build a MockDatabase for transfer_song_to_album.
    ///
    /// DB operation sequence (1 source album):
    ///   Q1: songs find_by_id
    ///   Q2: albums find_by_id (target)
    ///   Q3: albums_songs find all (current albums for song)
    ///   -- begin txn --
    ///   E1: delete_many albums_songs
    ///   E2: insert new albums_songs (exec)
    ///   Q4: insert new albums_songs (select-back)
    ///   E3: update_many staff_playlists
    ///   E4: update_many staff_playlist_archives
    ///   E5: update_many radio_playlists
    ///   E6: update_many radio_playlist_archives
    ///   E7: update_many source album status (per source album)
    ///   E8: update_many target album status
    ///   -- commit txn --
    ///   E9: insert action_log (exec)
    ///   Q5: insert action_log (select-back)
    fn build_song_to_album_db(
        source_album_ids: &[u32],
        staff_pl: u64,
        staff_arch: u64,
        radio_pl: u64,
        radio_arch: u64,
    ) -> sea_orm::DatabaseConnection {
        let song = common::make_test_song(1, 10, "My Song");
        let target_album = common::make_test_album(20, "Target Album");
        let current_assocs: Vec<AlbumsSongsModel> = source_album_ids
            .iter()
            .enumerate()
            .map(|(i, &aid)| make_test_albums_songs(100 + i as u32, aid, 1))
            .collect();
        let new_assoc = make_test_albums_songs(200, 20, 1);
        let action_log = common::make_test_action_log(1, "song.transfer_album", "song", 1);

        let mut builder = MockDatabase::new(DatabaseBackend::MySql);

        // Q1: songs find_by_id
        builder = builder.append_query_results(vec![vec![song]]);
        // Q2: albums find_by_id
        builder = builder.append_query_results(vec![vec![target_album]]);
        // Q3: albums_songs find all
        builder = builder.append_query_results(vec![current_assocs.clone()]);
        // E1: delete_many albums_songs
        builder = builder.append_exec_results(vec![exec(current_assocs.len() as u64)]);
        // E2: insert albums_songs (exec)
        builder = builder.append_exec_results(vec![exec_insert(200)]);
        // Q4: insert albums_songs (select-back)
        builder = builder.append_query_results(vec![vec![new_assoc]]);
        // E3: update_many staff_playlists
        builder = builder.append_exec_results(vec![exec(staff_pl)]);
        // E4: update_many staff_playlist_archives
        builder = builder.append_exec_results(vec![exec(staff_arch)]);
        // E5: update_many radio_playlists
        builder = builder.append_exec_results(vec![exec(radio_pl)]);
        // E6: update_many radio_playlist_archives
        builder = builder.append_exec_results(vec![exec(radio_arch)]);
        // E7..E7+N-1: update_many source album status (one per source album)
        for _ in source_album_ids {
            builder = builder.append_exec_results(vec![exec(1)]);
        }
        // E(7+N): update_many target album status
        builder = builder.append_exec_results(vec![exec(1)]);
        // E(8+N): insert action_log (exec)
        builder = builder.append_exec_results(vec![exec_insert(1)]);
        // Q5: insert action_log (select-back)
        builder = builder.append_query_results(vec![vec![action_log]]);

        builder.into_connection()
    }

    #[tokio::test]
    async fn transfer_song_to_album_success() {
        let db = build_song_to_album_db(&[5], 3, 2, 1, 4);
        let result = TransferService::transfer_song_to_album(&db, 1, 20, None, None).await;
        assert!(result.is_ok(), "transfer_song_to_album failed: {:?}", result.err());

        let tr = result.unwrap();
        assert!(tr.success);
        assert!(tr.message.contains("My Song"));
        assert!(tr.message.contains("Target Album"));
    }

    #[tokio::test]
    async fn transfer_song_to_album_affected_counts() {
        let db = build_song_to_album_db(&[5], 3, 2, 1, 4);
        let result = TransferService::transfer_song_to_album(&db, 1, 20, None, None)
            .await
            .unwrap();

        assert_eq!(result.affected.albums_songs, 1);
        assert_eq!(result.affected.staff_playlists, 3);
        assert_eq!(result.affected.staff_playlist_archives, 2);
        assert_eq!(result.affected.radio_playlists, 1);
        assert_eq!(result.affected.radio_playlist_archives, 4);
    }

    #[tokio::test]
    async fn transfer_song_to_album_multiple_source_albums() {
        // Song is on 2 albums → 2 source album status updates
        let db = build_song_to_album_db(&[5, 6], 1, 0, 0, 0);
        let result = TransferService::transfer_song_to_album(&db, 1, 20, None, None).await;
        assert!(result.is_ok(), "transfer_song_to_album failed: {:?}", result.err());

        let tr = result.unwrap();
        assert!(tr.success);
        // albums_songs delete should reflect 2 old associations
        assert_eq!(tr.affected.albums_songs, 2);
    }

    #[tokio::test]
    async fn transfer_song_to_album_zero_playlist_refs() {
        let db = build_song_to_album_db(&[5], 0, 0, 0, 0);
        let result = TransferService::transfer_song_to_album(&db, 1, 20, None, None)
            .await
            .unwrap();

        assert_eq!(result.affected.staff_playlists, 0);
        assert_eq!(result.affected.staff_playlist_archives, 0);
        assert_eq!(result.affected.radio_playlists, 0);
        assert_eq!(result.affected.radio_playlist_archives, 0);
    }
}

// ─── Song To Band Transfer Tests ───────────────────────────────

mod song_to_band_tests {
    use super::*;

    /// Build a MockDatabase for transfer_song_to_band.
    ///
    /// DB operation sequence (with source band):
    ///   Q1: songs find_by_id
    ///   Q2: bands find_by_id (target)
    ///   -- begin txn --
    ///   E1: update_many songs.band_id
    ///   E2: update_many staff_playlists
    ///   E3: update_many staff_playlist_archives
    ///   E4: update_many radio_playlists
    ///   E5: update_many radio_playlist_archives
    ///   E6: update_many radio_raw_datas
    ///   E7: update_many song_aliases
    ///   E8: update_many source band status (only if source_band_id is Some)
    ///   E9: update_many target band status
    ///   -- commit txn --
    ///   E10: insert action_log (exec)
    ///   Q3: insert action_log (select-back)
    fn build_song_to_band_db(
        source_band_id: Option<u32>,
        staff_pl: u64,
        staff_arch: u64,
        radio_pl: u64,
        radio_arch: u64,
        raw_data: u64,
        aliases: u64,
    ) -> sea_orm::DatabaseConnection {
        let song = {
            let mut s = common::make_test_song(1, 0, "My Song");
            s.band_id = source_band_id;
            s
        };
        let target_band = common::make_test_band(20, "Target Band");
        let action_log = common::make_test_action_log(1, "song.transfer_band", "song", 1);

        let mut builder = MockDatabase::new(DatabaseBackend::MySql);

        // Q1: songs find_by_id
        builder = builder.append_query_results(vec![vec![song]]);
        // Q2: bands find_by_id
        builder = builder.append_query_results(vec![vec![target_band]]);
        // E1: update_many songs.band_id
        builder = builder.append_exec_results(vec![exec(1)]);
        // E2: update_many staff_playlists
        builder = builder.append_exec_results(vec![exec(staff_pl)]);
        // E3: update_many staff_playlist_archives
        builder = builder.append_exec_results(vec![exec(staff_arch)]);
        // E4: update_many radio_playlists
        builder = builder.append_exec_results(vec![exec(radio_pl)]);
        // E5: update_many radio_playlist_archives
        builder = builder.append_exec_results(vec![exec(radio_arch)]);
        // E6: update_many radio_raw_datas
        builder = builder.append_exec_results(vec![exec(raw_data)]);
        // E7: update_many song_aliases
        builder = builder.append_exec_results(vec![exec(aliases)]);
        // E8: update_many source band status (only if Some)
        if source_band_id.is_some() {
            builder = builder.append_exec_results(vec![exec(1)]);
        }
        // E9: update_many target band status
        builder = builder.append_exec_results(vec![exec(1)]);
        // E10: insert action_log (exec)
        builder = builder.append_exec_results(vec![exec_insert(1)]);
        // Q3: insert action_log (select-back)
        builder = builder.append_query_results(vec![vec![action_log]]);

        builder.into_connection()
    }

    #[tokio::test]
    async fn transfer_song_to_band_success() {
        let db = build_song_to_band_db(Some(10), 3, 2, 1, 4, 5, 6);
        let result = TransferService::transfer_song_to_band(&db, 1, 20, None, None).await;
        assert!(result.is_ok(), "transfer_song_to_band failed: {:?}", result.err());

        let tr = result.unwrap();
        assert!(tr.success);
    }

    #[tokio::test]
    async fn transfer_song_to_band_no_source_band() {
        // song.band_id is None → skips source band status update (1 fewer exec)
        let db = build_song_to_band_db(None, 0, 0, 0, 0, 0, 0);
        let result = TransferService::transfer_song_to_band(&db, 1, 20, None, None).await;
        assert!(result.is_ok(), "transfer_song_to_band failed: {:?}", result.err());

        let tr = result.unwrap();
        assert!(tr.success);
        assert_eq!(tr.affected.songs, 1);
    }

    #[tokio::test]
    async fn transfer_song_to_band_affected_counts() {
        let db = build_song_to_band_db(Some(10), 3, 2, 1, 4, 5, 6);
        let result = TransferService::transfer_song_to_band(&db, 1, 20, None, None)
            .await
            .unwrap();

        assert_eq!(result.affected.songs, 1);
        assert_eq!(result.affected.staff_playlists, 3);
        assert_eq!(result.affected.staff_playlist_archives, 2);
        assert_eq!(result.affected.radio_playlists, 1);
        assert_eq!(result.affected.radio_playlist_archives, 4);
        assert_eq!(result.affected.radio_raw_datas, 5);
        assert_eq!(result.affected.song_aliases, 6);
    }

    #[tokio::test]
    async fn transfer_song_to_band_message() {
        let db = build_song_to_band_db(Some(10), 0, 0, 0, 0, 0, 0);
        let result = TransferService::transfer_song_to_band(&db, 1, 20, None, None)
            .await
            .unwrap();

        assert!(result.message.contains("My Song"), "message should contain song name");
        assert!(
            result.message.contains("Target Band"),
            "message should contain band name"
        );
    }
}

// ─── Album To Band Transfer Tests ──────────────────────────────

mod album_to_band_tests {
    use super::*;

    /// Build a MockDatabase for transfer_album_to_band WITHOUT songs.
    ///
    /// DB operation sequence (1 source band, no songs):
    ///   Q1: albums find_by_id
    ///   Q2: bands find_by_id (target)
    ///   Q3: albums_bands find all (current bands)
    ///   -- begin txn --
    ///   E1: delete_many albums_bands
    ///   E2: insert new albums_bands (exec)
    ///   Q4: insert new albums_bands (select-back)
    ///   E3: update_many staff_playlists
    ///   E4: update_many staff_playlist_archives
    ///   E5: update_many radio_playlists
    ///   E6: update_many radio_playlist_archives
    ///   E7..E7+N-1: update_many source band status (per source band)
    ///   E(7+N): update_many target band status
    ///   E(8+N): update_many album status
    ///   -- commit txn --
    ///   E(9+N): insert action_log (exec)
    ///   Q5: insert action_log (select-back)
    fn build_album_to_band_no_songs_db(
        source_band_ids: &[u32],
        staff_pl: u64,
        staff_arch: u64,
        radio_pl: u64,
        radio_arch: u64,
    ) -> sea_orm::DatabaseConnection {
        let album = common::make_test_album(1, "Test Album");
        let target_band = common::make_test_band(20, "Target Band");
        let current_bands: Vec<AlbumsBandsModel> = source_band_ids
            .iter()
            .enumerate()
            .map(|(i, &bid)| make_test_albums_bands(100 + i as u32, 1, bid))
            .collect();
        let new_assoc = make_test_albums_bands(200, 1, 20);
        let action_log = common::make_test_action_log(1, "album.transfer_band", "album", 1);

        let mut builder = MockDatabase::new(DatabaseBackend::MySql);

        // Q1: albums find_by_id
        builder = builder.append_query_results(vec![vec![album]]);
        // Q2: bands find_by_id
        builder = builder.append_query_results(vec![vec![target_band]]);
        // Q3: albums_bands find all
        builder = builder.append_query_results(vec![current_bands.clone()]);
        // E1: delete_many albums_bands
        builder = builder.append_exec_results(vec![exec(current_bands.len() as u64)]);
        // E2: insert albums_bands (exec)
        builder = builder.append_exec_results(vec![exec_insert(200)]);
        // Q4: insert albums_bands (select-back)
        builder = builder.append_query_results(vec![vec![new_assoc]]);
        // E3: update_many staff_playlists
        builder = builder.append_exec_results(vec![exec(staff_pl)]);
        // E4: update_many staff_playlist_archives
        builder = builder.append_exec_results(vec![exec(staff_arch)]);
        // E5: update_many radio_playlists
        builder = builder.append_exec_results(vec![exec(radio_pl)]);
        // E6: update_many radio_playlist_archives
        builder = builder.append_exec_results(vec![exec(radio_arch)]);
        // E7..E7+N-1: source band status updates
        for _ in source_band_ids {
            builder = builder.append_exec_results(vec![exec(1)]);
        }
        // E(7+N): target band status
        builder = builder.append_exec_results(vec![exec(1)]);
        // E(8+N): album status
        builder = builder.append_exec_results(vec![exec(1)]);
        // E(9+N): insert action_log (exec)
        builder = builder.append_exec_results(vec![exec_insert(1)]);
        // Q5: insert action_log (select-back)
        builder = builder.append_query_results(vec![vec![action_log]]);

        builder.into_connection()
    }

    /// Build a MockDatabase for transfer_album_to_band WITH songs.
    ///
    /// Adds to the no-songs sequence:
    ///   Q+: albums_songs find all → songs on album (after radio_playlist_archives update)
    ///   Per song:
    ///     E+: update_many songs.band_id
    ///     E+: update_many song_aliases
    ///     E+: update_many radio_raw_datas
    fn build_album_to_band_with_songs_db(
        source_band_ids: &[u32],
        song_ids: &[u32],
        aliases_per_song: u64,
        raw_per_song: u64,
    ) -> sea_orm::DatabaseConnection {
        let album = common::make_test_album(1, "Test Album");
        let target_band = common::make_test_band(20, "Target Band");
        let current_bands: Vec<AlbumsBandsModel> = source_band_ids
            .iter()
            .enumerate()
            .map(|(i, &bid)| make_test_albums_bands(100 + i as u32, 1, bid))
            .collect();
        let new_assoc = make_test_albums_bands(200, 1, 20);
        let songs_on_album: Vec<AlbumsSongsModel> = song_ids
            .iter()
            .enumerate()
            .map(|(i, &sid)| make_test_albums_songs(300 + i as u32, 1, sid))
            .collect();
        let action_log = common::make_test_action_log(1, "album.transfer_band", "album", 1);

        let mut builder = MockDatabase::new(DatabaseBackend::MySql);

        // Q1: albums find_by_id
        builder = builder.append_query_results(vec![vec![album]]);
        // Q2: bands find_by_id
        builder = builder.append_query_results(vec![vec![target_band]]);
        // Q3: albums_bands find all
        builder = builder.append_query_results(vec![current_bands.clone()]);
        // E1: delete_many albums_bands
        builder = builder.append_exec_results(vec![exec(current_bands.len() as u64)]);
        // E2: insert albums_bands (exec)
        builder = builder.append_exec_results(vec![exec_insert(200)]);
        // Q4: insert albums_bands (select-back)
        builder = builder.append_query_results(vec![vec![new_assoc]]);
        // E3: update_many staff_playlists
        builder = builder.append_exec_results(vec![exec(2)]);
        // E4: update_many staff_playlist_archives
        builder = builder.append_exec_results(vec![exec(1)]);
        // E5: update_many radio_playlists
        builder = builder.append_exec_results(vec![exec(0)]);
        // E6: update_many radio_playlist_archives
        builder = builder.append_exec_results(vec![exec(0)]);
        // Q+: albums_songs find all (songs on album) — transfer_songs=true
        builder = builder.append_query_results(vec![songs_on_album]);
        // Per song: 3 execs
        for _ in song_ids {
            // E+: update_many songs.band_id
            builder = builder.append_exec_results(vec![exec(1)]);
            // E+: update_many song_aliases
            builder = builder.append_exec_results(vec![exec(aliases_per_song)]);
            // E+: update_many radio_raw_datas
            builder = builder.append_exec_results(vec![exec(raw_per_song)]);
        }
        // E7..E7+N-1: source band status updates
        for _ in source_band_ids {
            builder = builder.append_exec_results(vec![exec(1)]);
        }
        // E(7+N): target band status
        builder = builder.append_exec_results(vec![exec(1)]);
        // E(8+N): album status
        builder = builder.append_exec_results(vec![exec(1)]);
        // E(9+N): insert action_log (exec)
        builder = builder.append_exec_results(vec![exec_insert(1)]);
        // Q5: insert action_log (select-back)
        builder = builder.append_query_results(vec![vec![action_log]]);

        builder.into_connection()
    }

    #[tokio::test]
    async fn transfer_album_to_band_no_songs_success() {
        let db = build_album_to_band_no_songs_db(&[10], 3, 2, 1, 4);
        let result =
            TransferService::transfer_album_to_band(&db, 1, 20, false, None, None).await;
        assert!(result.is_ok(), "transfer_album_to_band failed: {:?}", result.err());

        let tr = result.unwrap();
        assert!(tr.success);
        assert_eq!(tr.affected.albums_bands, 1);
        assert_eq!(tr.affected.songs, 0);
    }

    #[tokio::test]
    async fn transfer_album_to_band_with_songs_success() {
        let db = build_album_to_band_with_songs_db(&[10], &[50, 51], 2, 3);
        let result =
            TransferService::transfer_album_to_band(&db, 1, 20, true, None, None).await;
        assert!(result.is_ok(), "transfer_album_to_band failed: {:?}", result.err());

        let tr = result.unwrap();
        assert!(tr.success);
        assert_eq!(tr.affected.songs, 2);
        assert_eq!(tr.affected.song_aliases, 4); // 2 per song × 2 songs
        assert_eq!(tr.affected.radio_raw_datas, 6); // 3 per song × 2 songs
    }

    #[tokio::test]
    async fn transfer_album_to_band_message_with_songs() {
        let db = build_album_to_band_with_songs_db(&[10], &[50], 0, 0);
        let result = TransferService::transfer_album_to_band(&db, 1, 20, true, None, None)
            .await
            .unwrap();

        assert!(
            result.message.contains("(with songs)"),
            "Expected '(with songs)' suffix, got: {}",
            result.message
        );
        assert!(result.message.contains("Test Album"));
        assert!(result.message.contains("Target Band"));
    }

    #[tokio::test]
    async fn transfer_album_to_band_message_without_songs() {
        let db = build_album_to_band_no_songs_db(&[10], 0, 0, 0, 0);
        let result = TransferService::transfer_album_to_band(&db, 1, 20, false, None, None)
            .await
            .unwrap();

        assert!(
            !result.message.contains("(with songs)"),
            "Should not contain '(with songs)' when transfer_songs=false, got: {}",
            result.message
        );
    }

    #[tokio::test]
    async fn transfer_album_to_band_no_source_bands() {
        // albums_bands returns empty → no source band status updates
        let album = common::make_test_album(1, "Test Album");
        let target_band = common::make_test_band(20, "Target Band");
        let new_assoc = make_test_albums_bands(200, 1, 20);
        let action_log = common::make_test_action_log(1, "album.transfer_band", "album", 1);

        let db = MockDatabase::new(DatabaseBackend::MySql)
            // Q1: albums find_by_id
            .append_query_results(vec![vec![album]])
            // Q2: bands find_by_id
            .append_query_results(vec![vec![target_band]])
            // Q3: albums_bands find all → empty (no current bands)
            .append_query_results(vec![Vec::<AlbumsBandsModel>::new()])
            // E1: delete_many albums_bands (0 rows since empty)
            .append_exec_results(vec![exec(0)])
            // E2: insert albums_bands (exec)
            .append_exec_results(vec![exec_insert(200)])
            // Q4: insert albums_bands (select-back)
            .append_query_results(vec![vec![new_assoc]])
            // E3: update_many staff_playlists
            .append_exec_results(vec![exec(0)])
            // E4: update_many staff_playlist_archives
            .append_exec_results(vec![exec(0)])
            // E5: update_many radio_playlists
            .append_exec_results(vec![exec(0)])
            // E6: update_many radio_playlist_archives
            .append_exec_results(vec![exec(0)])
            // No source band status updates (source_band_ids is empty)
            // E7: target band status
            .append_exec_results(vec![exec(1)])
            // E8: album status
            .append_exec_results(vec![exec(1)])
            // E9: insert action_log (exec)
            .append_exec_results(vec![exec_insert(1)])
            // Q5: insert action_log (select-back)
            .append_query_results(vec![vec![action_log]])
            .into_connection();

        let result =
            TransferService::transfer_album_to_band(&db, 1, 20, false, None, None).await;
        assert!(result.is_ok(), "transfer_album_to_band failed: {:?}", result.err());

        let tr = result.unwrap();
        assert!(tr.success);
        assert_eq!(tr.affected.albums_bands, 0);
    }
}
