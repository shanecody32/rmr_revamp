//! Tests for album update, delete, and get_or_create operations.
//!
//! Mock patterns:
//! - update_album:  Q(find) + E(update) + Q(select-back)
//! - update_album_full: Q(find) + E(update) + Q(select-back) [+ E(delete_many) + E(insert_many) for songs]
//! - delete_album:  E(delete_by_id)
//! - get_or_create_unknown_album: Q(albums_bands) + Q(find album) [+ create sequence if needed]

mod common;

use sea_orm::{DatabaseBackend, MockDatabase, MockExecResult};

use backend::services::album::{AlbumService, AlbumSongInput, UpdateAlbumRequest};

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

// ─── Update Album Tests ─────────────────────────────────────────

mod update_album_tests {
    use super::*;

    #[tokio::test]
    async fn update_album_not_found() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            // Q1: find → empty
            .append_query_results(vec![Vec::<backend::models::albums::Model>::new()])
            .into_connection();

        let data = common::make_test_album(999, "Updated");
        let result = AlbumService::update_album(&db, 999, data).await;
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(
            matches!(err, sea_orm::DbErr::RecordNotFound(_)),
            "Expected RecordNotFound, got: {err:?}"
        );
    }

    #[tokio::test]
    async fn update_album_success() {
        let existing = common::make_test_album(1, "Old Album");
        let mut updated = existing.clone();
        updated.name = Some("New Album".to_string());

        let db = MockDatabase::new(DatabaseBackend::MySql)
            // Q1: find → existing
            .append_query_results(vec![vec![existing]])
            // E1: update exec
            .append_exec_results(vec![exec(1)])
            // Q2: update select-back
            .append_query_results(vec![vec![updated.clone()]])
            .into_connection();

        let data = common::make_test_album(1, "New Album");
        let result = AlbumService::update_album(&db, 1, data).await;
        assert!(result.is_ok(), "update_album failed: {:?}", result.err());
        let album = result.unwrap();
        assert_eq!(album.name, Some("New Album".to_string()));
    }
}

// ─── Update Album Full Tests ────────────────────────────────────

mod update_album_full_tests {
    use super::*;

    #[tokio::test]
    async fn update_album_full_not_found() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            // Q1: find → empty
            .append_query_results(vec![Vec::<backend::models::albums::Model>::new()])
            .into_connection();

        let req = UpdateAlbumRequest {
            name: Some("Updated".to_string()),
            release_date: None,
            label_id: None,
            itunes_url: None,
            cdbaby_url: None,
            amazon_url: None,
            itunes_id: None,
            rovi_id: None,
            about: None,
            thanks: None,
            producer: None,
            engineer: None,
            studio: None,
            master: None,
            verified: None,
            approved: None,
            songs: None,
        };
        let result = AlbumService::update_album_full(&db, 999, req).await;
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            sea_orm::DbErr::RecordNotFound(_)
        ));
    }

    #[tokio::test]
    async fn update_album_full_basic() {
        let existing = common::make_test_album(1, "Old Album");
        let mut updated = existing.clone();
        updated.name = Some("New Album".to_string());

        let db = MockDatabase::new(DatabaseBackend::MySql)
            // Q1: find → existing
            .append_query_results(vec![vec![existing]])
            // E1: update exec
            .append_exec_results(vec![exec(1)])
            // Q2: update select-back
            .append_query_results(vec![vec![updated.clone()]])
            .into_connection();

        let req = UpdateAlbumRequest {
            name: Some("New Album".to_string()),
            release_date: None,
            label_id: None,
            itunes_url: None,
            cdbaby_url: None,
            amazon_url: None,
            itunes_id: None,
            rovi_id: None,
            about: None,
            thanks: None,
            producer: None,
            engineer: None,
            studio: None,
            master: None,
            verified: None,
            approved: None,
            songs: None,
        };
        let result = AlbumService::update_album_full(&db, 1, req).await;
        assert!(result.is_ok(), "update_album_full failed: {:?}", result.err());
        let album = result.unwrap();
        assert_eq!(album.name, Some("New Album".to_string()));
    }

    #[tokio::test]
    async fn update_album_full_with_songs() {
        let existing = common::make_test_album(1, "Test Album");
        let updated = existing.clone();

        let db = MockDatabase::new(DatabaseBackend::MySql)
            // Q1: find → existing
            .append_query_results(vec![vec![existing]])
            // update is noop (no fields changed), so just select-back:
            // Q2: update select-back (find_updated_model_by_id)
            .append_query_results(vec![vec![updated.clone()]])
            // E1: delete_many existing songs
            .append_exec_results(vec![exec(0)])
            // E2: insert_many new song relations
            .append_exec_results(vec![exec_insert(1)])
            .into_connection();

        let req = UpdateAlbumRequest {
            name: None,
            release_date: None,
            label_id: None,
            itunes_url: None,
            cdbaby_url: None,
            amazon_url: None,
            itunes_id: None,
            rovi_id: None,
            about: None,
            thanks: None,
            producer: None,
            engineer: None,
            studio: None,
            master: None,
            verified: None,
            approved: None,
            songs: Some(vec![
                AlbumSongInput {
                    song_id: 10,
                    track_number: Some(1),
                    disc_number: Some(1),
                },
                AlbumSongInput {
                    song_id: 11,
                    track_number: Some(2),
                    disc_number: Some(1),
                },
            ]),
        };
        let result = AlbumService::update_album_full(&db, 1, req).await;
        assert!(result.is_ok(), "update_album_full_with_songs failed: {:?}", result.err());
    }
}

// ─── Delete Album Tests ─────────────────────────────────────────

mod delete_album_tests {
    use super::*;

    #[tokio::test]
    async fn delete_album_success() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            // E1: delete_by_id
            .append_exec_results(vec![exec(1)])
            .into_connection();

        let result = AlbumService::delete_album(&db, 1).await;
        assert!(result.is_ok(), "delete_album failed: {:?}", result.err());
        assert_eq!(result.unwrap().rows_affected, 1);
    }
}

// ─── Get or Create Unknown Album Tests ──────────────────────────

mod get_or_create_tests {
    use super::*;

    #[tokio::test]
    async fn get_or_create_finds_existing() {
        let ab = common::make_test_albums_bands(1, 10, 1);
        let mut album = common::make_test_album(10, "Unknown");
        album.name = Some("Unknown".to_string());

        let db = MockDatabase::new(DatabaseBackend::MySql)
            // Q1: albums_bands → 1 entry
            .append_query_results(vec![vec![ab]])
            // Q2: find album → "Unknown" album
            .append_query_results(vec![vec![album.clone()]])
            .into_connection();

        let result = AlbumService::get_or_create_unknown_album(&db, 1).await;
        assert!(result.is_ok(), "get_or_create_unknown_album failed: {:?}", result.err());
        let found = result.unwrap();
        assert_eq!(found.name, Some("Unknown".to_string()));
        assert_eq!(found.id, 10);
    }

    #[tokio::test]
    async fn get_or_create_skips_non_unknown() {
        let ab = common::make_test_albums_bands(1, 10, 1);
        let album = common::make_test_album(10, "Rock Album");
        // New album that will be created
        let new_album = common::make_test_album(20, "Unknown");
        let alias = common::make_test_album_alias(1, 20, 1, "Unknown");
        let new_ab = common::make_test_albums_bands(2, 20, 1);

        let db = MockDatabase::new(DatabaseBackend::MySql)
            // Q1: albums_bands → 1 entry
            .append_query_results(vec![vec![ab]])
            // Q2: find album → "Rock Album" (not "Unknown")
            .append_query_results(vec![vec![album]])
            // Now it creates a new album:
            // E1: insert album
            .append_exec_results(vec![exec_insert(20)])
            // Q3: select-back new album
            .append_query_results(vec![vec![new_album.clone()]])
            // create_album_alias:
            // Q4: alias exists check → empty
            .append_query_results(vec![Vec::<backend::models::album_aliases::Model>::new()])
            // E2: insert alias
            .append_exec_results(vec![exec_insert(1)])
            // Q5: select-back alias
            .append_query_results(vec![vec![alias]])
            // E3: insert albums_bands junction
            .append_exec_results(vec![exec_insert(2)])
            // Q6: select-back junction
            .append_query_results(vec![vec![new_ab]])
            .into_connection();

        let result = AlbumService::get_or_create_unknown_album(&db, 1).await;
        assert!(result.is_ok(), "get_or_create failed: {:?}", result.err());
        let created = result.unwrap();
        assert_eq!(created.name, Some("Unknown".to_string()));
    }

    #[tokio::test]
    async fn get_or_create_empty_band() {
        let new_album = common::make_test_album(20, "Unknown");
        let alias = common::make_test_album_alias(1, 20, 1, "Unknown");
        let new_ab = common::make_test_albums_bands(1, 20, 1);

        let db = MockDatabase::new(DatabaseBackend::MySql)
            // Q1: albums_bands → empty (no existing albums for band)
            .append_query_results(vec![Vec::<backend::models::albums_bands::Model>::new()])
            // E1: insert album
            .append_exec_results(vec![exec_insert(20)])
            // Q2: select-back new album
            .append_query_results(vec![vec![new_album.clone()]])
            // create_album_alias:
            // Q3: alias exists check → empty
            .append_query_results(vec![Vec::<backend::models::album_aliases::Model>::new()])
            // E2: insert alias
            .append_exec_results(vec![exec_insert(1)])
            // Q4: select-back alias
            .append_query_results(vec![vec![alias]])
            // E3: insert albums_bands junction
            .append_exec_results(vec![exec_insert(1)])
            // Q5: select-back junction
            .append_query_results(vec![vec![new_ab]])
            .into_connection();

        let result = AlbumService::get_or_create_unknown_album(&db, 1).await;
        assert!(result.is_ok(), "get_or_create_empty failed: {:?}", result.err());
        let created = result.unwrap();
        assert_eq!(created.name, Some("Unknown".to_string()));
    }
}
