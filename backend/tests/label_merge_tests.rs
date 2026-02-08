//! Tests for label merge operations.
//!
//! Uses SeaORM's MockDatabase to verify the LabelService::merge_labels pipeline.
//! The merge runs inside `db.transaction()` which shares the MockDatabase FIFO queue.
//!
//! Audit log after transaction uses `let _ = ...` (fire-and-forget, no mock needed).

mod common;

use sea_orm::{DatabaseBackend, DbErr, MockDatabase, MockExecResult};
use serde_json::json;

use backend::models::labels::Model as LabelModel;
use backend::services::label_service::{LabelService, MergeLabelsRequest};

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
    async fn merge_labels_target_not_found() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_query_results(vec![Vec::<LabelModel>::new()])
            .into_connection();

        let req = MergeLabelsRequest {
            from_ids: vec![2],
            into_id: 1,
            merged_data: json!({}),
        };
        let result = LabelService::merge_labels(&db, req, None, None).await;
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(
            matches!(err, DbErr::RecordNotFound(ref msg) if msg.contains("Target label")),
            "Expected RecordNotFound, got: {err:?}"
        );
    }
}

// ─── Empty Merge Tests ──────────────────────────────────────────

mod empty_merge {
    use super::*;

    /// Build a MockDatabase for an empty label merge (no secondary data).
    fn build_empty_merge_db() -> sea_orm::DatabaseConnection {
        let target = common::make_test_label(1, "Target Label");
        let mut builder = MockDatabase::new(DatabaseBackend::MySql);

        // Q1: pre-txn find
        builder = builder.append_query_results(vec![vec![target.clone()]]);
        // Q2: in-txn find for merged_data update
        builder = builder.append_query_results(vec![vec![target.clone()]]);
        // E1: active_model.update(txn) — exec
        builder = builder.append_exec_results(vec![exec(1)]);
        // Q3: active_model.update(txn) — select-back
        builder = builder.append_query_results(vec![vec![target.clone()]]);
        // Q4-Q7: 4 empty queries (albums, alias target, alias source, dup candidates)
        for _ in 0..4 {
            builder = builder.append_query_results(vec![Vec::<LabelModel>::new()]);
        }
        // E2: Label::delete_by_id(source).exec
        builder = builder.append_exec_results(vec![exec(1)]);
        // Q8: final find
        builder = builder.append_query_results(vec![vec![target.clone()]]);

        builder.into_connection()
    }

    #[tokio::test]
    async fn empty_merge_success() {
        let db = build_empty_merge_db();
        let req = MergeLabelsRequest {
            from_ids: vec![2],
            into_id: 1,
            merged_data: json!({}),
        };
        let result = LabelService::merge_labels(&db, req, None, None).await;
        assert!(result.is_ok(), "merge_labels failed: {:?}", result.err());

        let merge_result = result.unwrap();
        assert_eq!(merge_result.stats.labels_deleted, 1);
        assert_eq!(merge_result.stats.albums_reassigned, 0);
        assert_eq!(merge_result.stats.aliases_moved, 0);
        assert_eq!(merge_result.stats.aliases_deduped, 0);
        assert_eq!(merge_result.stats.duplicate_candidates_cleaned, 0);
    }

    #[tokio::test]
    async fn null_merged_data_skips_update() {
        let target = common::make_test_label(1, "Target Label");
        let mut builder = MockDatabase::new(DatabaseBackend::MySql);

        // Q1: pre-txn find
        builder = builder.append_query_results(vec![vec![target.clone()]]);
        // null merged_data → skip update block
        // Q2-Q5: 4 empty queries
        for _ in 0..4 {
            builder = builder.append_query_results(vec![Vec::<LabelModel>::new()]);
        }
        // E1: delete source
        builder = builder.append_exec_results(vec![exec(1)]);
        // Q6: final find
        builder = builder.append_query_results(vec![vec![target.clone()]]);

        let db = builder.into_connection();

        let req = MergeLabelsRequest {
            from_ids: vec![2],
            into_id: 1,
            merged_data: json!(null),
        };
        let result = LabelService::merge_labels(&db, req, None, None).await;
        assert!(result.is_ok(), "merge_labels failed: {:?}", result.err());
        assert_eq!(result.unwrap().stats.labels_deleted, 1);
    }

    #[tokio::test]
    async fn merged_label_returned() {
        let db = build_empty_merge_db();
        let req = MergeLabelsRequest {
            from_ids: vec![2],
            into_id: 1,
            merged_data: json!({}),
        };
        let result = LabelService::merge_labels(&db, req, None, None).await.unwrap();
        assert_eq!(result.merged_label.id, 1);
        assert_eq!(result.merged_label.name, Some("Target Label".to_string()));
    }

    #[tokio::test]
    async fn multiple_sources_deleted() {
        let target = common::make_test_label(1, "Target Label");
        let mut builder = MockDatabase::new(DatabaseBackend::MySql);

        // Q1: pre-txn find
        builder = builder.append_query_results(vec![vec![target.clone()]]);
        // null merged_data → skip update
        // With 2 sources:
        // Albums: source(2) + source(3) = 2
        // LabelAlias: target + source(2) + source(3) = 3
        // DupCandidates: source(2) + source(3) = 2
        // Total: 7
        for _ in 0..7 {
            builder = builder.append_query_results(vec![Vec::<LabelModel>::new()]);
        }
        // E1: delete source 2
        builder = builder.append_exec_results(vec![exec(1)]);
        // E2: delete source 3
        builder = builder.append_exec_results(vec![exec(1)]);
        // Q final: final find
        builder = builder.append_query_results(vec![vec![target.clone()]]);

        let db = builder.into_connection();

        let req = MergeLabelsRequest {
            from_ids: vec![2, 3],
            into_id: 1,
            merged_data: json!(null),
        };
        let result = LabelService::merge_labels(&db, req, None, None).await;
        assert!(result.is_ok(), "merge_labels failed: {:?}", result.err());
        assert_eq!(result.unwrap().stats.labels_deleted, 2);
    }
}
