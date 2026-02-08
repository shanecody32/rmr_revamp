//! Tests for staff member lifecycle operations (archive, unarchive).
//!
//! The error paths (not-found) are already covered in staff_service_tests.rs.
//! These tests cover the happy paths.
//!
//! Mock sequences:
//! - archive: Q(find) + E(log insert) + Q(log select-back) + E(update) + Q(update select-back)
//! - unarchive: Q(find) + E(log insert) + Q(log select-back) + E(update) + Q(update select-back)
//!
//! Note: ActionLogService calls use `let _ = ...` (fire-and-forget) so errors
//! are discarded, but the mock results are still consumed from the FIFO queue.

mod common;

use sea_orm::{DatabaseBackend, MockDatabase, MockExecResult};

use backend::models::action_logs::Model as ActionLogModel;
use backend::services::staff_service::StaffService;

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

fn make_action_log(id: u32) -> ActionLogModel {
    ActionLogModel {
        id,
        action_type: "staff_member.archive".to_string(),
        entity_type: "staff_member".to_string(),
        entity_id: 1,
        user_id: None,
        before_snapshot: None,
        after_snapshot: None,
        metadata: None,
        ip_address: None,
        created_at: chrono::NaiveDateTime::default(),
    }
}

// ─── Archive Tests ────────────────────────────────────────────────

mod archive_tests {
    use super::*;

    #[tokio::test]
    async fn archive_staff_member_success() {
        let staff = common::make_test_staff_member(1, Some(100), "John", "Doe");
        let mut archived = staff.clone();
        archived.archived = 1;
        archived.archived_reason = Some("Retired".to_string());

        let db = MockDatabase::new(DatabaseBackend::MySql)
            // Q1: find_by_id → staff
            .append_query_results(vec![vec![staff]])
            // E1: insert action log (exec)
            .append_exec_results(vec![exec_insert(1)])
            // Q2: insert action log (select-back)
            .append_query_results(vec![vec![make_action_log(1)]])
            // E2: update staff member (exec)
            .append_exec_results(vec![exec(1)])
            // Q3: update staff member (select-back)
            .append_query_results(vec![vec![archived.clone()]])
            .into_connection();

        let result = StaffService::archive_staff_member(&db, 1, "Retired", Some(42), None).await;
        assert!(result.is_ok(), "archive failed: {:?}", result.err());
        let model = result.unwrap();
        assert_eq!(model.id, 1);
        assert_eq!(model.archived, 1);
        assert_eq!(model.archived_reason, Some("Retired".to_string()));
    }

    #[tokio::test]
    async fn archive_preserves_station() {
        let staff = common::make_test_staff_member(5, Some(200), "Jane", "Smith");
        let mut archived = staff.clone();
        archived.archived = 1;
        archived.archived_reason = Some("Left station".to_string());

        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_query_results(vec![vec![staff]])
            .append_exec_results(vec![exec_insert(1)])
            .append_query_results(vec![vec![make_action_log(1)]])
            .append_exec_results(vec![exec(1)])
            .append_query_results(vec![vec![archived.clone()]])
            .into_connection();

        let result =
            StaffService::archive_staff_member(&db, 5, "Left station", None, None).await;
        assert!(result.is_ok(), "archive failed: {:?}", result.err());
        let model = result.unwrap();
        assert_eq!(model.radio_station_id, Some(200));
    }
}

// ─── Unarchive Tests ──────────────────────────────────────────────

mod unarchive_tests {
    use super::*;

    #[tokio::test]
    async fn unarchive_staff_member_success() {
        let mut staff = common::make_test_staff_member(1, Some(100), "John", "Doe");
        staff.archived = 1;
        staff.archived_reason = Some("Retired".to_string());

        let mut unarchived = staff.clone();
        unarchived.archived = 0;
        unarchived.archived_reason = None;

        let db = MockDatabase::new(DatabaseBackend::MySql)
            // Q1: find_by_id → archived staff
            .append_query_results(vec![vec![staff]])
            // E1: insert action log (exec)
            .append_exec_results(vec![exec_insert(1)])
            // Q2: insert action log (select-back)
            .append_query_results(vec![vec![{
                let mut log = make_action_log(1);
                log.action_type = "staff_member.unarchive".to_string();
                log
            }]])
            // E2: update staff member (exec)
            .append_exec_results(vec![exec(1)])
            // Q3: update staff member (select-back)
            .append_query_results(vec![vec![unarchived.clone()]])
            .into_connection();

        let result = StaffService::unarchive_staff_member(&db, 1, Some(42), None).await;
        assert!(result.is_ok(), "unarchive failed: {:?}", result.err());
        let model = result.unwrap();
        assert_eq!(model.id, 1);
        assert_eq!(model.archived, 0);
        assert!(model.archived_reason.is_none());
    }

    #[tokio::test]
    async fn unarchive_clears_archived_fields() {
        let mut staff = common::make_test_staff_member(3, Some(100), "Bob", "Jones");
        staff.archived = 1;
        staff.archived_at = Some(chrono::Utc::now().naive_utc());
        staff.archived_reason = Some("Temporary leave".to_string());

        let mut unarchived = staff.clone();
        unarchived.archived = 0;
        unarchived.archived_at = None;
        unarchived.archived_reason = None;

        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_query_results(vec![vec![staff]])
            .append_exec_results(vec![exec_insert(1)])
            .append_query_results(vec![vec![{
                let mut log = make_action_log(1);
                log.action_type = "staff_member.unarchive".to_string();
                log
            }]])
            .append_exec_results(vec![exec(1)])
            .append_query_results(vec![vec![unarchived.clone()]])
            .into_connection();

        let result = StaffService::unarchive_staff_member(&db, 3, None, None).await;
        assert!(result.is_ok(), "unarchive failed: {:?}", result.err());
        let model = result.unwrap();
        assert_eq!(model.archived, 0);
        assert!(model.archived_at.is_none());
        assert!(model.archived_reason.is_none());
    }
}
