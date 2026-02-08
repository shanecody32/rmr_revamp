//! Tests for StaffPlaylistService CRUD operations.
//!
//! Uses SeaORM's MockDatabase to verify delete, update-spins, bulk-update,
//! check-duplicate, and import-from-archive pipelines.
//!
//! Functions that use `.count(db)` (get_playlist_entries, get_archive_entries,
//! finalise_playlist, unlock_playlist, get_entity_duplicate_warnings) are not
//! covered here because MockDatabase count extraction is fragile.

mod common;

use sea_orm::{DatabaseBackend, DbErr, MockDatabase, MockExecResult};

use backend::models::staff_playlists::Model as PlaylistModel;
use backend::models::staff_playlist_archives::Model as ArchiveModel;
use backend::services::staff_playlist_service::StaffPlaylistService;

fn exec(rows_affected: u64) -> MockExecResult {
    MockExecResult {
        last_insert_id: 0,
        rows_affected,
    }
}

fn insert_exec(last_insert_id: u64) -> MockExecResult {
    MockExecResult {
        last_insert_id,
        rows_affected: 1,
    }
}

// ─── Delete Tests ──────────────────────────────────────────────────

mod delete_tests {
    use super::*;

    #[tokio::test]
    async fn delete_entries_empty_ids() {
        // No mock results needed — early return for empty vec
        let db = MockDatabase::new(DatabaseBackend::MySql).into_connection();
        let result = StaffPlaylistService::delete_entries(&db, vec![]).await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 0);
    }

    #[tokio::test]
    async fn delete_entries_success() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            // E1: delete_many().exec() → 3 rows affected
            .append_exec_results(vec![exec(3)])
            .into_connection();

        let result = StaffPlaylistService::delete_entries(&db, vec![1, 2, 3]).await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 3);
    }

    #[tokio::test]
    async fn delete_all_entries_success() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            // E1: delete_many().exec() → 5 rows affected
            .append_exec_results(vec![exec(5)])
            .into_connection();

        let result = StaffPlaylistService::delete_all_entries(&db, 42).await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 5);
    }
}

// ─── Update Spins Tests ────────────────────────────────────────────

mod update_spins_tests {
    use super::*;

    #[tokio::test]
    async fn update_spins_not_found() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            // Q1: find_by_id().into_model().one() → None
            .append_query_results(vec![Vec::<PlaylistModel>::new()])
            .into_connection();

        let result = StaffPlaylistService::update_spins(&db, 999, Some(10)).await;
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(
            matches!(err, DbErr::RecordNotFound(ref msg) if msg.contains("Playlist entry not found")),
            "Expected RecordNotFound, got: {err:?}"
        );
    }

    #[tokio::test]
    async fn update_spins_success() {
        let model = common::make_test_staff_playlist(1, 42);
        let mut updated_model = model.clone();
        updated_model.spins = Some(10);

        let db = MockDatabase::new(DatabaseBackend::MySql)
            // Q1: find_by_id(1).into_model().one() → existing entry
            .append_query_results(vec![vec![model.clone()]])
            // E1: Entity::update(active).exec() — UPDATE statement
            .append_exec_results(vec![exec(1)])
            // Q2: Entity::update() select-back → updated model
            .append_query_results(vec![vec![updated_model.clone()]])
            // Q3: find_by_id(1).into_model().one() → re-read after update
            .append_query_results(vec![vec![updated_model.clone()]])
            // enrichment: 0 queries (all IDs are None)
            .into_connection();

        let result = StaffPlaylistService::update_spins(&db, 1, Some(10)).await;
        assert!(result.is_ok(), "update_spins failed: {:?}", result.err());
        let response = result.unwrap();
        assert_eq!(response.id, 1);
        assert_eq!(response.spins, Some(10));
        assert_eq!(response.staff_member_id, Some(42));
    }

    #[tokio::test]
    async fn add_spins_not_found() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            // Q1: find_by_id().into_model().one() → None
            .append_query_results(vec![Vec::<PlaylistModel>::new()])
            .into_connection();

        let result = StaffPlaylistService::add_spins_to_existing(&db, 999, 3).await;
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(
            matches!(err, DbErr::RecordNotFound(ref msg) if msg.contains("Playlist entry not found")),
            "Expected RecordNotFound, got: {err:?}"
        );
    }

    #[tokio::test]
    async fn add_spins_success() {
        let mut model = common::make_test_staff_playlist(1, 42);
        model.spins = Some(5);
        let mut updated_model = model.clone();
        updated_model.spins = Some(8); // 5 + 3

        let db = MockDatabase::new(DatabaseBackend::MySql)
            // Q1: find_by_id(1).into_model().one() → existing with spins=5
            .append_query_results(vec![vec![model]])
            // E1: Entity::update(active).exec() — UPDATE statement
            .append_exec_results(vec![exec(1)])
            // Q2: Entity::update() select-back → updated model
            .append_query_results(vec![vec![updated_model.clone()]])
            // Q3: find_by_id(1).into_model().one() → re-read after update
            .append_query_results(vec![vec![updated_model.clone()]])
            // enrichment: 0 queries (all IDs are None)
            .into_connection();

        let result = StaffPlaylistService::add_spins_to_existing(&db, 1, 3).await;
        assert!(result.is_ok(), "add_spins failed: {:?}", result.err());
        let response = result.unwrap();
        assert_eq!(response.id, 1);
        assert_eq!(response.spins, Some(8));
    }
}

// ─── Bulk Update Tests ─────────────────────────────────────────────

mod bulk_update_tests {
    use super::*;
    use backend::services::staff_playlist_service::BulkUpdateSpinsEntry;

    #[tokio::test]
    async fn bulk_update_empty_list() {
        let db = MockDatabase::new(DatabaseBackend::MySql).into_connection();
        let result = StaffPlaylistService::bulk_update_spins(&db, vec![]).await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 0);
    }

    #[tokio::test]
    async fn bulk_update_mixed() {
        // Item 1 exists (rows_affected=1), item 2 not found (rows_affected=0)
        // Now uses update_many() — 1 exec per item, no queries
        let db = MockDatabase::new(DatabaseBackend::MySql)
            // E1: update_many for item 1 — found, 1 row affected
            .append_exec_results(vec![exec(1)])
            // E2: update_many for item 2 — not found, 0 rows affected
            .append_exec_results(vec![exec(0)])
            .into_connection();

        let updates = vec![
            BulkUpdateSpinsEntry { id: 1, spins: Some(10) },
            BulkUpdateSpinsEntry { id: 2, spins: Some(5) },
        ];
        let result = StaffPlaylistService::bulk_update_spins(&db, updates).await;
        assert!(result.is_ok(), "bulk_update failed: {:?}", result.err());
        assert_eq!(result.unwrap(), 1);
    }

    #[tokio::test]
    async fn bulk_update_none_found() {
        // Now uses update_many() — 1 exec per item, no queries
        let db = MockDatabase::new(DatabaseBackend::MySql)
            // E1: update_many for item 1 — not found, 0 rows affected
            .append_exec_results(vec![exec(0)])
            // E2: update_many for item 2 — not found, 0 rows affected
            .append_exec_results(vec![exec(0)])
            .into_connection();

        let updates = vec![
            BulkUpdateSpinsEntry { id: 1, spins: Some(10) },
            BulkUpdateSpinsEntry { id: 2, spins: Some(5) },
        ];
        let result = StaffPlaylistService::bulk_update_spins(&db, updates).await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 0);
    }
}

// ─── Check Duplicate Tests ─────────────────────────────────────────

mod check_duplicate_tests {
    use super::*;
    use backend::services::staff_playlist_service::CheckDuplicateParams;

    #[tokio::test]
    async fn check_duplicate_not_found() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            // Q1: find().filter(...).into_model().one() → None
            .append_query_results(vec![Vec::<PlaylistModel>::new()])
            .into_connection();

        let params = CheckDuplicateParams {
            staff_member_id: 42,
            band_id: 1,
            song_id: 2,
            album_id: None,
        };
        let result = StaffPlaylistService::check_duplicate(&db, params).await;
        assert!(result.is_ok());
        assert!(result.unwrap().is_none());
    }

    #[tokio::test]
    async fn check_duplicate_found() {
        let model = common::make_test_staff_playlist(10, 42);

        let db = MockDatabase::new(DatabaseBackend::MySql)
            // Q1: find().filter(...).into_model().one() → Some(model)
            .append_query_results(vec![vec![model]])
            // enrichment: 0 queries (all IDs are None)
            .into_connection();

        let params = CheckDuplicateParams {
            staff_member_id: 42,
            band_id: 1,
            song_id: 2,
            album_id: None,
        };
        let result = StaffPlaylistService::check_duplicate(&db, params).await;
        assert!(result.is_ok(), "check_duplicate failed: {:?}", result.err());
        let response = result.unwrap();
        assert!(response.is_some());
        let entry = response.unwrap();
        assert_eq!(entry.id, 10);
        assert_eq!(entry.staff_member_id, Some(42));
    }
}

// ─── Import Tests ──────────────────────────────────────────────────

mod import_tests {
    use super::*;
    use backend::services::staff_playlist_service::ImportFromArchiveRequest;

    #[tokio::test]
    async fn import_empty_archive() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            // Q1: StaffPlaylistArchive::find().into_model().all() → empty
            .append_query_results(vec![Vec::<ArchiveModel>::new()])
            // Q2: StaffPlaylist::find().into_model().all() → empty
            .append_query_results(vec![Vec::<PlaylistModel>::new()])
            .into_connection();

        let req = ImportFromArchiveRequest {
            staff_member_id: 42,
            week_ending: None,
            with_spins: true,
        };
        let result = StaffPlaylistService::import_from_archive(&db, req).await;
        assert!(result.is_ok(), "import failed: {:?}", result.err());
        let import_result = result.unwrap();
        assert_eq!(import_result.imported_count, 0);
        assert_eq!(import_result.skipped_count, 0);
    }

    #[tokio::test]
    async fn import_all_skipped() {
        // Archive has 2 entries; existing playlist has matching keys → all skipped
        let mut arch1 = common::make_test_staff_playlist_archive(100, 42);
        arch1.band_id = Some(1);
        arch1.song_id = Some(10);
        arch1.album_id = Some(50);

        let mut arch2 = common::make_test_staff_playlist_archive(101, 42);
        arch2.band_id = Some(2);
        arch2.song_id = Some(20);
        arch2.album_id = None;

        // Existing playlist entries with the same (band_id, song_id, album_id) keys
        let mut existing1 = common::make_test_staff_playlist(1, 42);
        existing1.band_id = Some(1);
        existing1.song_id = Some(10);
        existing1.album_id = Some(50);

        let mut existing2 = common::make_test_staff_playlist(2, 42);
        existing2.band_id = Some(2);
        existing2.song_id = Some(20);
        existing2.album_id = None;

        let db = MockDatabase::new(DatabaseBackend::MySql)
            // Q1: archive entries
            .append_query_results(vec![vec![arch1, arch2]])
            // Q2: existing playlist entries
            .append_query_results(vec![vec![existing1, existing2]])
            .into_connection();

        let req = ImportFromArchiveRequest {
            staff_member_id: 42,
            week_ending: None,
            with_spins: true,
        };
        let result = StaffPlaylistService::import_from_archive(&db, req).await;
        assert!(result.is_ok(), "import failed: {:?}", result.err());
        let import_result = result.unwrap();
        assert_eq!(import_result.imported_count, 0);
        assert_eq!(import_result.skipped_count, 2);
    }

    #[tokio::test]
    async fn import_some_new() {
        // Archive has 2 entries; existing has 1 matching key → 1 imported, 1 skipped
        let mut arch1 = common::make_test_staff_playlist_archive(100, 42);
        arch1.band_id = Some(1);
        arch1.song_id = Some(10);
        arch1.album_id = Some(50);
        arch1.spins = Some(5);

        let mut arch2 = common::make_test_staff_playlist_archive(101, 42);
        arch2.band_id = Some(2);
        arch2.song_id = Some(20);
        arch2.album_id = None;
        arch2.spins = Some(3);

        // Only arch1's key exists in playlist
        let mut existing1 = common::make_test_staff_playlist(1, 42);
        existing1.band_id = Some(1);
        existing1.song_id = Some(10);
        existing1.album_id = Some(50);

        let db = MockDatabase::new(DatabaseBackend::MySql)
            // Q1: archive entries
            .append_query_results(vec![vec![arch1, arch2]])
            // Q2: existing playlist entries
            .append_query_results(vec![vec![existing1]])
            // E1: insert new entry for arch2
            .append_exec_results(vec![insert_exec(2)])
            .into_connection();

        let req = ImportFromArchiveRequest {
            staff_member_id: 42,
            week_ending: None,
            with_spins: true,
        };
        let result = StaffPlaylistService::import_from_archive(&db, req).await;
        assert!(result.is_ok(), "import failed: {:?}", result.err());
        let import_result = result.unwrap();
        assert_eq!(import_result.imported_count, 1);
        assert_eq!(import_result.skipped_count, 1);
    }
}
