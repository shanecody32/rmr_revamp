//! Tests for ActionLogService specialized record methods.
//!
//! The base `record()` method is already tested in service_tests.rs.
//! These tests cover the thin wrapper methods that construct metadata
//! and delegate to `record()`.
//!
//! Mock sequence for each: active_model.insert(db) = 1 exec + 1 query (select-back).

mod common;

use sea_orm::{DatabaseBackend, MockDatabase, MockExecResult};

use backend::models::action_logs::Model as ActionLogModel;
use backend::services::action_log_service::ActionLogService;

fn exec_insert(last_insert_id: u64) -> MockExecResult {
    MockExecResult {
        last_insert_id,
        rows_affected: 1,
    }
}

fn make_log(id: u32, action_type: &str, entity_type: &str, entity_id: u32) -> ActionLogModel {
    ActionLogModel {
        id,
        action_type: action_type.to_string(),
        entity_type: entity_type.to_string(),
        entity_id,
        user_id: None,
        before_snapshot: None,
        after_snapshot: None,
        metadata: None,
        ip_address: None,
        created_at: chrono::NaiveDateTime::default(),
    }
}

/// Build a MockDatabase that supports a single insert (1 exec + 1 query select-back).
fn build_insert_db(action_type: &str, entity_type: &str, entity_id: u32) -> sea_orm::DatabaseConnection {
    MockDatabase::new(DatabaseBackend::MySql)
        .append_exec_results(vec![exec_insert(1)])
        .append_query_results(vec![vec![make_log(1, action_type, entity_type, entity_id)]])
        .into_connection()
}

// ─── Merge Record Methods ─────────────────────────────────────────

mod merge_records {
    use super::*;
    use serde_json::json;

    #[tokio::test]
    async fn record_staff_merge() {
        let db = build_insert_db("staff_member.merge", "staff_member", 1);
        let result = ActionLogService::record_staff_merge(
            &db, 1, Some(42),
            &json!({"id": 1}), &json!({"id": 1, "merged": true}),
            &json!({"staff_deleted": 2}), &[2, 3], None,
        ).await;
        assert!(result.is_ok(), "record_staff_merge failed: {:?}", result.err());
        let log = result.unwrap();
        assert_eq!(log.entity_id, 1);
        assert_eq!(log.action_type, "staff_member.merge");
    }

    #[tokio::test]
    async fn record_band_merge() {
        let db = build_insert_db("band.merge", "band", 10);
        let result = ActionLogService::record_band_merge(
            &db, 10, Some(42),
            &json!({"id": 10}), &json!({"id": 10}),
            &json!({"songs_moved": 5}), &[11, 12], None,
        ).await;
        assert!(result.is_ok(), "record_band_merge failed: {:?}", result.err());
        let log = result.unwrap();
        assert_eq!(log.entity_id, 10);
        assert_eq!(log.entity_type, "band");
    }

    #[tokio::test]
    async fn record_album_merge() {
        let db = build_insert_db("album.merge", "album", 20);
        let result = ActionLogService::record_album_merge(
            &db, 20, None,
            &json!({"id": 20}), &json!({"id": 20}),
            &json!({"songs_moved": 3}), &[21], None,
        ).await;
        assert!(result.is_ok(), "record_album_merge failed: {:?}", result.err());
        let log = result.unwrap();
        assert_eq!(log.entity_id, 20);
        assert_eq!(log.entity_type, "album");
    }

    #[tokio::test]
    async fn record_song_merge() {
        let db = build_insert_db("song.merge", "song", 30);
        let result = ActionLogService::record_song_merge(
            &db, 30, Some(1),
            &json!({"id": 30}), &json!({"id": 30}),
            &json!({"aliases_moved": 2}), &[31, 32, 33], None,
        ).await;
        assert!(result.is_ok(), "record_song_merge failed: {:?}", result.err());
        let log = result.unwrap();
        assert_eq!(log.entity_id, 30);
        assert_eq!(log.entity_type, "song");
    }

    #[tokio::test]
    async fn record_radio_station_merge() {
        let db = build_insert_db("radio_station.merge", "radio_station", 40);
        let result = ActionLogService::record_radio_station_merge(
            &db, 40, Some(5),
            &json!({"id": 40}), &json!({"id": 40}),
            &json!({"staff_reassigned": 4}), &[41], None,
        ).await;
        assert!(result.is_ok(), "record_radio_station_merge failed: {:?}", result.err());
        let log = result.unwrap();
        assert_eq!(log.entity_id, 40);
        assert_eq!(log.entity_type, "radio_station");
    }

    #[tokio::test]
    async fn record_label_merge() {
        let db = build_insert_db("label.merge", "label", 50);
        let result = ActionLogService::record_label_merge(
            &db, 50, None,
            &json!({"id": 50}), &json!({"id": 50}),
            &json!({"albums_reassigned": 7}), &[51, 52], None,
        ).await;
        assert!(result.is_ok(), "record_label_merge failed: {:?}", result.err());
        let log = result.unwrap();
        assert_eq!(log.entity_id, 50);
        assert_eq!(log.entity_type, "label");
    }
}

// ─── Staff-Specific Record Methods ────────────────────────────────

mod staff_records {
    use super::*;
    use serde_json::json;

    #[tokio::test]
    async fn record_staff_transfer() {
        let db = build_insert_db("staff_member.transfer", "staff_member", 1);
        let result = ActionLogService::record_staff_transfer(
            &db, 1, 2, Some(42), 100, 200, "Moving to new station", None,
        ).await;
        assert!(result.is_ok(), "record_staff_transfer failed: {:?}", result.err());
        let log = result.unwrap();
        assert_eq!(log.entity_id, 1);
        assert_eq!(log.action_type, "staff_member.transfer");
    }

    #[tokio::test]
    async fn record_staff_archive() {
        let db = build_insert_db("staff_member.archive", "staff_member", 5);
        let result = ActionLogService::record_staff_archive(
            &db, 5, Some(1), &json!({"id": 5, "archived": 0}), "Retired", None,
        ).await;
        assert!(result.is_ok(), "record_staff_archive failed: {:?}", result.err());
        let log = result.unwrap();
        assert_eq!(log.entity_id, 5);
        assert_eq!(log.action_type, "staff_member.archive");
    }

    #[tokio::test]
    async fn record_staff_unarchive() {
        let db = build_insert_db("staff_member.unarchive", "staff_member", 5);
        let result = ActionLogService::record_staff_unarchive(
            &db, 5, Some(1), &json!({"id": 5, "archived": 1}), None,
        ).await;
        assert!(result.is_ok(), "record_staff_unarchive failed: {:?}", result.err());
        let log = result.unwrap();
        assert_eq!(log.entity_id, 5);
        assert_eq!(log.action_type, "staff_member.unarchive");
    }

    #[tokio::test]
    async fn record_staff_admin_edit() {
        let db = build_insert_db("staff_member.admin_edit", "staff_member", 5);
        let result = ActionLogService::record_staff_admin_edit(
            &db, 5, Some(1),
            &json!({"first_name": "Old"}), &json!({"first_name": "New"}),
            "Name correction", None,
        ).await;
        assert!(result.is_ok(), "record_staff_admin_edit failed: {:?}", result.err());
        let log = result.unwrap();
        assert_eq!(log.entity_id, 5);
        assert_eq!(log.action_type, "staff_member.admin_edit");
    }
}
