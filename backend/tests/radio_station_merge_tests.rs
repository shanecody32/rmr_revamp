//! Tests for radio station merge operations.
//!
//! Uses SeaORM's MockDatabase to verify the RadioStationService::merge_radio_stations pipeline.
//! The merge runs inside `db.transaction()` which shares the MockDatabase FIFO queue.
//!
//! Audit log after transaction uses `let _ = ...` (fire-and-forget, no mock needed).

mod common;

use sea_orm::{DatabaseBackend, DbErr, MockDatabase, MockExecResult};
use serde_json::json;

use backend::models::radio_stations::Model as RadioStationModel;
use backend::services::radio_station_service::{MergeRadioStationsRequest, RadioStationService};

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
    async fn merge_radio_stations_target_not_found() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_query_results(vec![Vec::<RadioStationModel>::new()])
            .into_connection();

        let req = MergeRadioStationsRequest {
            from_ids: vec![2],
            into_id: 1,
            merged_data: json!({}),
        };
        let result = RadioStationService::merge_radio_stations(&db, req, None, None).await;
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(
            matches!(err, DbErr::RecordNotFound(ref msg) if msg.contains("Target radio station")),
            "Expected RecordNotFound, got: {err:?}"
        );
    }
}

// ─── Empty Merge Tests ──────────────────────────────────────────

mod empty_merge {
    use super::*;

    /// Build a MockDatabase for an empty radio station merge (no secondary data).
    /// With null merged_data and 1 source, 36 empty queries for all secondary tables.
    fn build_empty_merge_db() -> sea_orm::DatabaseConnection {
        let target = common::make_test_radio_station(1, "Target Station");
        let mut builder = MockDatabase::new(DatabaseBackend::MySql);

        // Q1: pre-txn find
        builder = builder.append_query_results(vec![vec![target.clone()]]);
        // Q2-Q37: 36 empty queries for all secondary tables
        for _ in 0..36 {
            builder = builder.append_query_results(vec![Vec::<RadioStationModel>::new()]);
        }
        // E1: RadioStation::delete_by_id(source).exec
        builder = builder.append_exec_results(vec![exec(1)]);
        // Q38: final find
        builder = builder.append_query_results(vec![vec![target.clone()]]);

        builder.into_connection()
    }

    #[tokio::test]
    async fn empty_merge_success() {
        let db = build_empty_merge_db();
        let req = MergeRadioStationsRequest {
            from_ids: vec![2],
            into_id: 1,
            merged_data: json!(null),
        };
        let result = RadioStationService::merge_radio_stations(&db, req, None, None).await;
        assert!(result.is_ok(), "merge_radio_stations failed: {:?}", result.err());

        let merge_result = result.unwrap();
        assert_eq!(merge_result.stats.radio_stations_deleted, 1);
        assert_eq!(merge_result.stats.addresses_moved, 0);
        assert_eq!(merge_result.stats.emails_moved, 0);
        assert_eq!(merge_result.stats.images_moved, 0);
        assert_eq!(merge_result.stats.links_moved, 0);
        assert_eq!(merge_result.stats.phone_numbers_moved, 0);
        assert_eq!(merge_result.stats.staff_members_reassigned, 0);
        assert_eq!(merge_result.stats.radio_playlists_moved, 0);
        assert_eq!(merge_result.stats.radio_playlist_archives_moved, 0);
        assert_eq!(merge_result.stats.raw_data_updated, 0);
        assert_eq!(merge_result.stats.song_aliases_reassigned, 0);
        assert_eq!(merge_result.stats.album_aliases_reassigned, 0);
        assert_eq!(merge_result.stats.station_aliases_moved, 0);
    }

    #[tokio::test]
    async fn merged_station_returned() {
        let db = build_empty_merge_db();
        let req = MergeRadioStationsRequest {
            from_ids: vec![2],
            into_id: 1,
            merged_data: json!(null),
        };
        let result = RadioStationService::merge_radio_stations(&db, req, None, None)
            .await
            .unwrap();
        assert_eq!(result.merged_station.id, 1);
        assert_eq!(result.merged_station.name, Some("Target Station".to_string()));
    }

    #[tokio::test]
    async fn empty_merge_with_merged_data() {
        let target = common::make_test_radio_station(1, "Target Station");
        let mut builder = MockDatabase::new(DatabaseBackend::MySql);

        // Q1: pre-txn find
        builder = builder.append_query_results(vec![vec![target.clone()]]);
        // Q2: in-txn find for merged_data update
        builder = builder.append_query_results(vec![vec![target.clone()]]);
        // E1: active_model.update(txn) — exec
        builder = builder.append_exec_results(vec![exec(1)]);
        // Q3: active_model.update(txn) — select-back
        builder = builder.append_query_results(vec![vec![target.clone()]]);
        // Q4-Q39: 36 empty queries for secondary tables
        for _ in 0..36 {
            builder = builder.append_query_results(vec![Vec::<RadioStationModel>::new()]);
        }
        // E2: delete source
        builder = builder.append_exec_results(vec![exec(1)]);
        // Q40: final find
        builder = builder.append_query_results(vec![vec![target.clone()]]);

        let db = builder.into_connection();

        let req = MergeRadioStationsRequest {
            from_ids: vec![2],
            into_id: 1,
            merged_data: json!({"name": "Updated Station"}),
        };
        let result = RadioStationService::merge_radio_stations(&db, req, None, None).await;
        assert!(result.is_ok(), "merge_radio_stations failed: {:?}", result.err());
        assert_eq!(result.unwrap().stats.radio_stations_deleted, 1);
    }
}
