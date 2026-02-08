//! Tests for band and album merge operations.
//!
//! These tests use SeaORM's MockDatabase to verify the merge pipelines
//! without hitting a real database. MockDatabase shares a single FIFO queue
//! between the outer connection and any transaction created from it.
//!
//! IMPORTANT: SeaORM's `active_model.update(txn)` internally does TWO
//! operations: an exec (UPDATE SQL) then a query (SELECT to return the
//! updated model). Each `.update()` call therefore consumes one exec result
//! AND one query result. Only `delete_by_id().exec()` consumes just an exec.

mod common;

use sea_orm::{DatabaseBackend, DbErr, MockDatabase, MockExecResult};
use serde_json::json;

use backend::models::bands::Model as BandModel;
use backend::models::albums::Model as AlbumModel;
use backend::models::songs::Model as SongModel;
use backend::services::{
    BandService, MergeBandsRequest,
    AlbumService, MergeAlbumsRequest,
};

// ─── Band Merge Tests ────────────────────────────────────────────

mod band_merge {
    use super::*;

    #[tokio::test]
    async fn test_target_not_found() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_query_results(vec![Vec::<BandModel>::new()])
            .into_connection();

        let req = MergeBandsRequest {
            from_ids: vec![2],
            into_id: 1,
            merged_data: json!({}),
        };
        let result = BandService::merge_bands(&db, req, None, None).await;
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(
            matches!(err, DbErr::RecordNotFound(ref msg) if msg.contains("Target band")),
            "Expected RecordNotFound, got: {err:?}"
        );
    }

    #[tokio::test]
    async fn test_empty_merge_success() {
        let target = common::make_test_band(1, "Target Band");
        let mut builder = MockDatabase::new(DatabaseBackend::MySql);

        // Q1: pre-txn Band::find_by_id(target) → Some(band)
        builder = builder.append_query_results(vec![vec![target.clone()]]);
        // Q2: in-txn Band::find_by_id(target) for merged_data update → Some(band)
        builder = builder.append_query_results(vec![vec![target.clone()]]);
        // E1: active_model.update(txn) — exec
        builder = builder.append_exec_results(vec![MockExecResult {
            last_insert_id: 1,
            rows_affected: 1,
        }]);
        // Q3: active_model.update(txn) — select-back after update
        builder = builder.append_query_results(vec![vec![target.clone()]]);
        // Q4-Q37: 34 empty queries for secondary tables
        for _ in 0..34 {
            builder = builder.append_query_results(vec![Vec::<BandModel>::new()]);
        }
        // E2: Band::delete_by_id(source).exec — exec only, no select-back
        builder = builder.append_exec_results(vec![MockExecResult {
            last_insert_id: 0,
            rows_affected: 1,
        }]);
        // Q38: final Band::find_by_id(target) → Some(band)
        builder = builder.append_query_results(vec![vec![target.clone()]]);

        let db = builder.into_connection();

        let req = MergeBandsRequest {
            from_ids: vec![2],
            into_id: 1,
            merged_data: json!({}),
        };
        let result = BandService::merge_bands(&db, req, None, None).await;
        assert!(result.is_ok(), "merge_bands failed: {:?}", result.err());

        let merge_result = result.unwrap();
        assert_eq!(merge_result.stats.bands_deleted, 1);
        assert_eq!(merge_result.stats.songs_moved, 0);
        assert_eq!(merge_result.stats.images_moved, 0);
        assert_eq!(merge_result.stats.albums_moved, 0);
        assert!(merge_result.duplicate_songs.is_empty());
    }

    #[tokio::test]
    async fn test_null_merged_data_skips_update() {
        let target = common::make_test_band(1, "Target Band");
        let mut builder = MockDatabase::new(DatabaseBackend::MySql);

        // Q1: pre-txn find
        builder = builder.append_query_results(vec![vec![target.clone()]]);
        // No merged_data update (null skips the block)
        // Q2-Q35: 34 empty queries for secondary tables
        for _ in 0..34 {
            builder = builder.append_query_results(vec![Vec::<BandModel>::new()]);
        }
        // E1: Band::delete_by_id(source).exec
        builder = builder.append_exec_results(vec![MockExecResult {
            last_insert_id: 0,
            rows_affected: 1,
        }]);
        // Q36: final find
        builder = builder.append_query_results(vec![vec![target.clone()]]);

        let db = builder.into_connection();

        let req = MergeBandsRequest {
            from_ids: vec![2],
            into_id: 1,
            merged_data: json!(null),
        };
        let result = BandService::merge_bands(&db, req, None, None).await;
        assert!(result.is_ok(), "merge_bands failed: {:?}", result.err());
        assert_eq!(result.unwrap().stats.bands_deleted, 1);
    }

    #[tokio::test]
    async fn test_detects_song_duplicates() {
        let target = common::make_test_band(1, "Target Band");
        let target_song = common::make_test_song(100, 1, "Highway Blues");
        let source_song = common::make_test_song(200, 2, "highway blues");

        let mut builder = MockDatabase::new(DatabaseBackend::MySql);

        // Q1: pre-txn find
        builder = builder.append_query_results(vec![vec![target.clone()]]);
        // null merged_data — skip update block
        // Q2-Q9: 8 empty queries (images target/source, links target/source, contact target/source, aliases target/source)
        for _ in 0..8 {
            builder = builder.append_query_results(vec![Vec::<BandModel>::new()]);
        }
        // Q10: Song target.all → [target_song]
        builder = builder.append_query_results(vec![vec![target_song.clone()]]);
        // Q11: Song source.all → [source_song]
        builder = builder.append_query_results(vec![vec![source_song.clone()]]);
        // Source song matches target (case-insensitive) → duplicate, NOT moved, no exec

        // Q12-Q35: remaining 24 empty queries
        for _ in 0..24 {
            builder = builder.append_query_results(vec![Vec::<BandModel>::new()]);
        }
        // E1: Band::delete_by_id(source).exec
        builder = builder.append_exec_results(vec![MockExecResult {
            last_insert_id: 0,
            rows_affected: 1,
        }]);
        // Q36: final find
        builder = builder.append_query_results(vec![vec![target.clone()]]);

        let db = builder.into_connection();

        let req = MergeBandsRequest {
            from_ids: vec![2],
            into_id: 1,
            merged_data: json!(null),
        };
        let result = BandService::merge_bands(&db, req, None, None).await;
        assert!(result.is_ok(), "merge_bands failed: {:?}", result.err());

        let merge_result = result.unwrap();
        assert_eq!(merge_result.duplicate_songs.len(), 1);
        assert_eq!(merge_result.duplicate_songs[0].from_song_id, 200);
        assert_eq!(merge_result.duplicate_songs[0].target_song_id, 100);
        assert_eq!(merge_result.stats.songs_moved, 0);
    }

    #[tokio::test]
    async fn test_moves_non_duplicate_songs() {
        let target = common::make_test_band(1, "Target Band");
        let source_song = common::make_test_song(200, 2, "New Song");
        let moved_song = common::make_test_song(200, 1, "New Song"); // after move, band_id=target

        let mut builder = MockDatabase::new(DatabaseBackend::MySql);

        // Q1: pre-txn find
        builder = builder.append_query_results(vec![vec![target.clone()]]);
        // null merged_data — skip update block
        // Q2-Q9: 8 empty queries (images, links, contact, aliases)
        for _ in 0..8 {
            builder = builder.append_query_results(vec![Vec::<BandModel>::new()]);
        }
        // Q10: Song target.all → [] (no existing songs)
        builder = builder.append_query_results(vec![Vec::<SongModel>::new()]);
        // Q11: Song source.all → [source_song] (one song to move)
        builder = builder.append_query_results(vec![vec![source_song.clone()]]);
        // E1: song active.update(txn) — exec
        builder = builder.append_exec_results(vec![MockExecResult {
            last_insert_id: 0,
            rows_affected: 1,
        }]);
        // Q12: song active.update(txn) — select-back
        builder = builder.append_query_results(vec![vec![moved_song.clone()]]);

        // Q13-Q36: remaining 24 empty queries
        for _ in 0..24 {
            builder = builder.append_query_results(vec![Vec::<BandModel>::new()]);
        }
        // E2: Band::delete_by_id(source).exec
        builder = builder.append_exec_results(vec![MockExecResult {
            last_insert_id: 0,
            rows_affected: 1,
        }]);
        // Q37: final find
        builder = builder.append_query_results(vec![vec![target.clone()]]);

        let db = builder.into_connection();

        let req = MergeBandsRequest {
            from_ids: vec![2],
            into_id: 1,
            merged_data: json!(null),
        };
        let result = BandService::merge_bands(&db, req, None, None).await;
        assert!(result.is_ok(), "merge_bands failed: {:?}", result.err());

        let merge_result = result.unwrap();
        assert_eq!(merge_result.stats.songs_moved, 1);
        assert!(merge_result.duplicate_songs.is_empty());
    }
}

// ─── Album Merge Tests ──────────────────────────────────────────

mod album_merge {
    use super::*;

    #[tokio::test]
    async fn test_target_not_found() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_query_results(vec![Vec::<AlbumModel>::new()])
            .into_connection();

        let req = MergeAlbumsRequest {
            from_ids: vec![2],
            into_id: 1,
            merged_data: json!({}),
        };
        let result = AlbumService::merge_albums(&db, req, None, None).await;
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(
            matches!(err, DbErr::RecordNotFound(ref msg) if msg.contains("Target album")),
            "Expected RecordNotFound, got: {err:?}"
        );
    }

    #[tokio::test]
    async fn test_empty_merge_success() {
        let target = common::make_test_album(1, "Target Album");
        let mut builder = MockDatabase::new(DatabaseBackend::MySql);

        // Q1: pre-txn find
        builder = builder.append_query_results(vec![vec![target.clone()]]);
        // Q2: in-txn find for merged_data update
        builder = builder.append_query_results(vec![vec![target.clone()]]);
        // E1: active_model.update(txn) — exec
        builder = builder.append_exec_results(vec![MockExecResult {
            last_insert_id: 1,
            rows_affected: 1,
        }]);
        // Q3: active_model.update(txn) — select-back
        builder = builder.append_query_results(vec![vec![target.clone()]]);
        // Q4-Q28: 25 empty queries for secondary tables
        for _ in 0..25 {
            builder = builder.append_query_results(vec![Vec::<AlbumModel>::new()]);
        }
        // E2: Album::delete_by_id(source).exec
        builder = builder.append_exec_results(vec![MockExecResult {
            last_insert_id: 0,
            rows_affected: 1,
        }]);
        // Q29: final find
        builder = builder.append_query_results(vec![vec![target.clone()]]);

        let db = builder.into_connection();

        let req = MergeAlbumsRequest {
            from_ids: vec![2],
            into_id: 1,
            merged_data: json!({}),
        };
        let result = AlbumService::merge_albums(&db, req, None, None).await;
        assert!(result.is_ok(), "merge_albums failed: {:?}", result.err());

        let merge_result = result.unwrap();
        assert_eq!(merge_result.stats.albums_deleted, 1);
        assert_eq!(merge_result.stats.images_moved, 0);
        assert_eq!(merge_result.stats.images_deduped, 0);
    }

    #[tokio::test]
    async fn test_null_merged_data_skips_update() {
        let target = common::make_test_album(1, "Target Album");
        let mut builder = MockDatabase::new(DatabaseBackend::MySql);

        // Q1: pre-txn find
        builder = builder.append_query_results(vec![vec![target.clone()]]);
        // No merged_data update (null skips the block)
        // Q2-Q26: 25 empty queries
        for _ in 0..25 {
            builder = builder.append_query_results(vec![Vec::<AlbumModel>::new()]);
        }
        // E1: delete source
        builder = builder.append_exec_results(vec![MockExecResult {
            last_insert_id: 0,
            rows_affected: 1,
        }]);
        // Q27: final find
        builder = builder.append_query_results(vec![vec![target.clone()]]);

        let db = builder.into_connection();

        let req = MergeAlbumsRequest {
            from_ids: vec![2],
            into_id: 1,
            merged_data: json!(null),
        };
        let result = AlbumService::merge_albums(&db, req, None, None).await;
        assert!(result.is_ok(), "merge_albums failed: {:?}", result.err());
        assert_eq!(result.unwrap().stats.albums_deleted, 1);
    }

    #[tokio::test]
    async fn test_image_dedup() {
        let target = common::make_test_album(1, "Target Album");
        let existing_img = common::make_test_album_image(10, 1, "existing.jpg");
        let dup_img = common::make_test_album_image(20, 2, "existing.jpg");
        let new_img = common::make_test_album_image(21, 2, "new.jpg");
        // After move, album_id changes to target
        let moved_img = common::make_test_album_image(21, 1, "new.jpg");

        let mut builder = MockDatabase::new(DatabaseBackend::MySql);

        // Q1: pre-txn find
        builder = builder.append_query_results(vec![vec![target.clone()]]);
        // null merged_data — skip update block
        // Q2: AlbumImage target.all → [existing_img]
        builder = builder.append_query_results(vec![vec![existing_img.clone()]]);
        // Q3: AlbumImage source.all → [dup_img, new_img]
        builder = builder.append_query_results(vec![vec![dup_img.clone(), new_img.clone()]]);
        // dup_img path matches existing → skipped (images_deduped++)
        // new_img path is new → moved via active.update(txn)
        // E1: active.update(txn) — exec
        builder = builder.append_exec_results(vec![MockExecResult {
            last_insert_id: 0,
            rows_affected: 1,
        }]);
        // Q4: active.update(txn) — select-back
        builder = builder.append_query_results(vec![vec![moved_img.clone()]]);

        // Q5-Q27: remaining 23 empty queries for other secondary tables
        for _ in 0..23 {
            builder = builder.append_query_results(vec![Vec::<AlbumModel>::new()]);
        }
        // E2: Album::delete_by_id(source).exec
        builder = builder.append_exec_results(vec![MockExecResult {
            last_insert_id: 0,
            rows_affected: 1,
        }]);
        // Q28: final find
        builder = builder.append_query_results(vec![vec![target.clone()]]);

        let db = builder.into_connection();

        let req = MergeAlbumsRequest {
            from_ids: vec![2],
            into_id: 1,
            merged_data: json!(null),
        };
        let result = AlbumService::merge_albums(&db, req, None, None).await;
        assert!(result.is_ok(), "merge_albums failed: {:?}", result.err());

        let merge_result = result.unwrap();
        assert_eq!(merge_result.stats.images_moved, 1);
        assert_eq!(merge_result.stats.images_deduped, 1);
    }
}
