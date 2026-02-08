//! Tests for staff member merge, transfer, and archive operations.
//!
//! Uses SeaORM's MockDatabase to verify the StaffService pipelines.
//! The merge and transfer run inside `db.transaction()` which shares the MockDatabase FIFO queue.
//!
//! Audit log after transaction uses `let _ = ...` (fire-and-forget, no mock needed).

mod common;

use sea_orm::{DatabaseBackend, DbErr, MockDatabase, MockExecResult};
use serde_json::json;

use backend::models::staff_members::Model as StaffMemberModel;
use backend::models::radio_stations::Model as RadioStationModel;
use backend::services::staff_service::{MergeStaffRequest, StaffService};

fn exec(rows_affected: u64) -> MockExecResult {
    MockExecResult {
        last_insert_id: 0,
        rows_affected,
    }
}

// ─── Merge Error Tests ──────────────────────────────────────────

mod merge_error_tests {
    use super::*;

    #[tokio::test]
    async fn merge_staff_target_not_found() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_query_results(vec![Vec::<StaffMemberModel>::new()])
            .into_connection();

        let req = MergeStaffRequest {
            from_ids: vec![2],
            into_id: 1,
            merged_data: json!({}),
        };
        let result = StaffService::merge_staff_members(&db, req, None, None).await;
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(
            matches!(err, DbErr::RecordNotFound(ref msg) if msg.contains("Target staff")),
            "Expected RecordNotFound, got: {err:?}"
        );
    }

    #[tokio::test]
    async fn merge_staff_source_not_found() {
        let target = common::make_test_staff_member(1, Some(100), "John", "Doe");
        let db = MockDatabase::new(DatabaseBackend::MySql)
            // Q1: find target → Some
            .append_query_results(vec![vec![target.clone()]])
            // Q2: find from_ids → empty (source 2 not found)
            .append_query_results(vec![Vec::<StaffMemberModel>::new()])
            .into_connection();

        let req = MergeStaffRequest {
            from_ids: vec![2],
            into_id: 1,
            merged_data: json!({}),
        };
        let result = StaffService::merge_staff_members(&db, req, None, None).await;
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(
            matches!(err, DbErr::RecordNotFound(ref msg) if msg.contains("source staff")),
            "Expected RecordNotFound about source, got: {err:?}"
        );
    }

    #[tokio::test]
    async fn merge_staff_different_stations() {
        let target = common::make_test_staff_member(1, Some(100), "John", "Doe");
        let source = common::make_test_staff_member(2, Some(200), "Jane", "Smith");
        let db = MockDatabase::new(DatabaseBackend::MySql)
            // Q1: find target → Some
            .append_query_results(vec![vec![target]])
            // Q2: find from_ids → [source] (different station)
            .append_query_results(vec![vec![source]])
            .into_connection();

        let req = MergeStaffRequest {
            from_ids: vec![2],
            into_id: 1,
            merged_data: json!({}),
        };
        let result = StaffService::merge_staff_members(&db, req, None, None).await;
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(
            matches!(err, DbErr::Custom(ref msg) if msg.contains("different radio stations")),
            "Expected Custom error about different stations, got: {err:?}"
        );
    }
}

// ─── Empty Merge Tests ──────────────────────────────────────────

mod empty_merge {
    use super::*;

    /// Build a MockDatabase for an empty staff merge (no secondary data).
    fn build_empty_merge_db() -> sea_orm::DatabaseConnection {
        let target = common::make_test_staff_member(1, Some(100), "John", "Doe");
        let source = common::make_test_staff_member(2, Some(100), "Jane", "Smith");
        let mut builder = MockDatabase::new(DatabaseBackend::MySql);

        // Q1: pre-txn find target
        builder = builder.append_query_results(vec![vec![target.clone()]]);
        // Q2: pre-txn find from_ids
        builder = builder.append_query_results(vec![vec![source]]);
        // Q3-Q15: 13 empty queries (images, links, phones, addresses, aliases, playlists, archives)
        for _ in 0..13 {
            builder = builder.append_query_results(vec![Vec::<StaffMemberModel>::new()]);
        }
        // Q16: StaffPlaylistArchive for recalculate_sub_genres → empty
        builder = builder.append_query_results(vec![Vec::<StaffMemberModel>::new()]);
        // E1: delete_many sub_genres (clear existing)
        builder = builder.append_exec_results(vec![exec(0)]);
        // Q17-Q20: 4 duplicate candidate queries → empty
        for _ in 0..4 {
            builder = builder.append_query_results(vec![Vec::<StaffMemberModel>::new()]);
        }
        // E2: StaffMember::delete_by_id(source).exec
        builder = builder.append_exec_results(vec![exec(1)]);
        // Q21: final find
        builder = builder.append_query_results(vec![vec![target.clone()]]);

        builder.into_connection()
    }

    #[tokio::test]
    async fn empty_merge_success() {
        let db = build_empty_merge_db();
        let req = MergeStaffRequest {
            from_ids: vec![2],
            into_id: 1,
            merged_data: json!(null),
        };
        let result = StaffService::merge_staff_members(&db, req, None, None).await;
        assert!(result.is_ok(), "merge_staff_members failed: {:?}", result.err());

        let merge_result = result.unwrap();
        assert_eq!(merge_result.stats.staff_deleted, 1);
        assert_eq!(merge_result.stats.images_moved, 0);
        assert_eq!(merge_result.stats.links_moved, 0);
        assert_eq!(merge_result.stats.phones_moved, 0);
        assert_eq!(merge_result.stats.addresses_moved, 0);
        assert_eq!(merge_result.stats.aliases_moved, 0);
        assert_eq!(merge_result.stats.playlists_moved, 0);
        assert_eq!(merge_result.stats.playlist_archives_moved, 0);
    }

    #[tokio::test]
    async fn merged_staff_returned() {
        let db = build_empty_merge_db();
        let req = MergeStaffRequest {
            from_ids: vec![2],
            into_id: 1,
            merged_data: json!(null),
        };
        let result = StaffService::merge_staff_members(&db, req, None, None)
            .await
            .unwrap();
        assert_eq!(result.merged_staff.id, 1);
        assert_eq!(result.merged_staff.first_name, Some("John".to_string()));
        assert_eq!(result.merged_staff.last_name, Some("Doe".to_string()));
    }
}

// ─── Transfer Error Tests ───────────────────────────────────────

mod transfer_error_tests {
    use super::*;
    use backend::services::staff_service::StaffTransferRequest;

    #[tokio::test]
    async fn transfer_source_not_found() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_query_results(vec![Vec::<StaffMemberModel>::new()])
            .into_connection();

        let req = StaffTransferRequest {
            staff_member_id: 99,
            new_station_id: 200,
            transfer_reason: "Moving".to_string(),
        };
        let result = StaffService::transfer_to_station(&db, req, None, None).await;
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(
            matches!(err, DbErr::RecordNotFound(ref msg) if msg.contains("Source staff")),
            "Expected RecordNotFound about source, got: {err:?}"
        );
    }

    #[tokio::test]
    async fn transfer_target_station_not_found() {
        let source = common::make_test_staff_member(1, Some(100), "John", "Doe");
        let db = MockDatabase::new(DatabaseBackend::MySql)
            // Q1: find source staff → Some
            .append_query_results(vec![vec![source]])
            // Q2: find target station → None
            .append_query_results(vec![Vec::<RadioStationModel>::new()])
            .into_connection();

        let req = StaffTransferRequest {
            staff_member_id: 1,
            new_station_id: 999,
            transfer_reason: "Moving".to_string(),
        };
        let result = StaffService::transfer_to_station(&db, req, None, None).await;
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(
            matches!(err, DbErr::RecordNotFound(ref msg) if msg.contains("Target radio station")),
            "Expected RecordNotFound about target station, got: {err:?}"
        );
    }
}

// ─── Archive Tests ──────────────────────────────────────────────

mod archive_tests {
    use super::*;

    #[tokio::test]
    async fn archive_staff_not_found() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_query_results(vec![Vec::<StaffMemberModel>::new()])
            .into_connection();

        let result =
            StaffService::archive_staff_member(&db, 99, "Retired", None, None).await;
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(
            matches!(err, DbErr::RecordNotFound(ref msg) if msg.contains("Staff member")),
            "Expected RecordNotFound, got: {err:?}"
        );
    }

    #[tokio::test]
    async fn unarchive_staff_not_found() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_query_results(vec![Vec::<StaffMemberModel>::new()])
            .into_connection();

        let result = StaffService::unarchive_staff_member(&db, 99, None, None).await;
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(
            matches!(err, DbErr::RecordNotFound(ref msg) if msg.contains("Staff member")),
            "Expected RecordNotFound, got: {err:?}"
        );
    }
}
