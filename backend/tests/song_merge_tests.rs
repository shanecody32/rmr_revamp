//! Tests for song merge operations.
//!
//! Uses SeaORM's MockDatabase to verify the SongService::merge_songs pipeline.
//! The merge runs inside `db.transaction()` which shares the MockDatabase FIFO queue.
//!
//! Mock result rules:
//! - `Entity::find_by_id().one()` / `Entity::find().all()` → 1 query result
//! - `active_model.update(txn)` → 1 exec + 1 query (select-back)
//! - `active_model.delete(txn)` → 1 exec result
//! - `delete_by_id().exec()` → 1 exec result
//! - Audit log after transaction uses `let _ = ...` (fire-and-forget, no mock needed)

mod common;

use sea_orm::{DatabaseBackend, DbErr, MockDatabase, MockExecResult};
use serde_json::json;

use backend::models::songs::Model as SongModel;
use backend::services::song_service::{MergeSongsRequest, SongService};

fn exec(rows_affected: u64) -> MockExecResult {
    MockExecResult {
        last_insert_id: 0,
        rows_affected,
    }
}

// ─── Error Tests ────────────────────────────────────────────────

mod error_tests {
    use super::*;

    #[tokio::test]
    async fn merge_songs_target_not_found() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_query_results(vec![Vec::<SongModel>::new()])
            .into_connection();

        let req = MergeSongsRequest {
            from_ids: vec![2],
            into_id: 1,
            merged_data: json!({}),
        };
        let result = SongService::merge_songs(&db, req, None, None).await;
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(
            matches!(err, DbErr::RecordNotFound(ref msg) if msg.contains("Target song")),
            "Expected RecordNotFound, got: {err:?}"
        );
    }
}

// ─── Empty Merge Tests ──────────────────────────────────────────

mod empty_merge {
    use super::*;

    /// Build a MockDatabase for an empty song merge (no secondary data to move).
    fn build_empty_merge_db() -> sea_orm::DatabaseConnection {
        let target = common::make_test_song(1, 10, "Target Song");
        let mut builder = MockDatabase::new(DatabaseBackend::MySql);

        // Q1: pre-txn find
        builder = builder.append_query_results(vec![vec![target.clone()]]);
        // Q2: in-txn find for merged_data update
        builder = builder.append_query_results(vec![vec![target.clone()]]);
        // E1: active_model.update(txn) — exec
        builder = builder.append_exec_results(vec![exec(1)]);
        // Q3: active_model.update(txn) — select-back
        builder = builder.append_query_results(vec![vec![target.clone()]]);
        // Q4-Q26: 23 empty queries for secondary tables
        for _ in 0..23 {
            builder = builder.append_query_results(vec![Vec::<SongModel>::new()]);
        }
        // E2: Song::delete_by_id(source).exec
        builder = builder.append_exec_results(vec![exec(1)]);
        // Q27: final find
        builder = builder.append_query_results(vec![vec![target.clone()]]);

        builder.into_connection()
    }

    #[tokio::test]
    async fn empty_merge_success() {
        let db = build_empty_merge_db();
        let req = MergeSongsRequest {
            from_ids: vec![2],
            into_id: 1,
            merged_data: json!({}),
        };
        let result = SongService::merge_songs(&db, req, None, None).await;
        assert!(result.is_ok(), "merge_songs failed: {:?}", result.err());

        let merge_result = result.unwrap();
        assert_eq!(merge_result.stats.songs_deleted, 1);
        assert_eq!(merge_result.stats.performers_moved, 0);
        assert_eq!(merge_result.stats.performers_deduped, 0);
        assert_eq!(merge_result.stats.album_associations_moved, 0);
        assert_eq!(merge_result.stats.radio_playlists_moved, 0);
        assert_eq!(merge_result.stats.staff_playlists_moved, 0);
        assert_eq!(merge_result.stats.aliases_moved, 0);
        assert_eq!(merge_result.stats.raw_data_updated, 0);
    }

    #[tokio::test]
    async fn null_merged_data_skips_update() {
        let target = common::make_test_song(1, 10, "Target Song");
        let mut builder = MockDatabase::new(DatabaseBackend::MySql);

        // Q1: pre-txn find
        builder = builder.append_query_results(vec![vec![target.clone()]]);
        // null merged_data → skips update block
        // Q2-Q24: 23 empty queries for secondary tables
        for _ in 0..23 {
            builder = builder.append_query_results(vec![Vec::<SongModel>::new()]);
        }
        // E1: Song::delete_by_id(source).exec
        builder = builder.append_exec_results(vec![exec(1)]);
        // Q25: final find
        builder = builder.append_query_results(vec![vec![target.clone()]]);

        let db = builder.into_connection();

        let req = MergeSongsRequest {
            from_ids: vec![2],
            into_id: 1,
            merged_data: json!(null),
        };
        let result = SongService::merge_songs(&db, req, None, None).await;
        assert!(result.is_ok(), "merge_songs failed: {:?}", result.err());
        assert_eq!(result.unwrap().stats.songs_deleted, 1);
    }

    #[tokio::test]
    async fn merged_song_returned() {
        let db = build_empty_merge_db();
        let req = MergeSongsRequest {
            from_ids: vec![2],
            into_id: 1,
            merged_data: json!({}),
        };
        let result = SongService::merge_songs(&db, req, None, None).await.unwrap();
        assert_eq!(result.merged_song.id, 1);
        assert_eq!(result.merged_song.name, Some("Target Song".to_string()));
    }

    #[tokio::test]
    async fn multiple_sources_deleted() {
        let target = common::make_test_song(1, 10, "Target Song");
        let mut builder = MockDatabase::new(DatabaseBackend::MySql);

        // Q1: pre-txn find
        builder = builder.append_query_results(vec![vec![target.clone()]]);
        // null merged_data → skip update block
        // With batch is_in() queries (2 sources):
        // Performers: target(1) + source_batch(1) = 2
        // AlbumsSongs: target(1) + source_batch(1) = 2
        // RadioPlaylist: target(1) + source_batch(1) = 2
        // RadioPlaylistArchive: target(1) + source_batch(1) = 2
        // StaffPlaylist: target(1) + source_batch(1) = 2
        // StaffPlaylistArchive: target(1) + source_batch(1) = 2
        // RadioRawData: source_batch(1) = 1
        // SongRanking: source_batch(1) = 1
        // SongTotalStats: source_batch(1) = 1
        // SongWeeklyStats: source_batch(1) = 1
        // TempSongTotalStats: source_batch(1) = 1
        // SongAlias: target(1) + source_batch(1) = 2
        // DupCand: id1_batch(1) + id2_batch(1) + self_refs(1) + all_target(1) = 4
        // Total: 2*6 + 1*5 + 2 + 4 = 23
        for _ in 0..23 {
            builder = builder.append_query_results(vec![Vec::<SongModel>::new()]);
        }
        // E1: Song::delete_by_id(2).exec
        builder = builder.append_exec_results(vec![exec(1)]);
        // E2: Song::delete_by_id(3).exec
        builder = builder.append_exec_results(vec![exec(1)]);
        // Q final: Song::find_by_id(target)
        builder = builder.append_query_results(vec![vec![target.clone()]]);

        let db = builder.into_connection();

        let req = MergeSongsRequest {
            from_ids: vec![2, 3],
            into_id: 1,
            merged_data: json!(null),
        };
        let result = SongService::merge_songs(&db, req, None, None).await;
        assert!(result.is_ok(), "merge_songs failed: {:?}", result.err());
        assert_eq!(result.unwrap().stats.songs_deleted, 2);
    }
}
