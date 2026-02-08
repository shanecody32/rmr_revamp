//! Tests for AppState async methods (duplicate scan running flags).

mod common;

use sea_orm::{DatabaseBackend, MockDatabase};

#[tokio::test]
async fn test_no_scans_running_initially() {
    let db = MockDatabase::new(DatabaseBackend::MySql).into_connection();
    let state = common::mock_app_state(db);

    assert!(!state.is_any_scan_running().await);
}

#[tokio::test]
async fn test_set_scan_running_true() {
    let db = MockDatabase::new(DatabaseBackend::MySql).into_connection();
    let state = common::mock_app_state(db);

    state.set_scan_running("bands", true).await;
    assert!(state.is_scan_running("bands").await);
}

#[tokio::test]
async fn test_set_scan_running_false() {
    let db = MockDatabase::new(DatabaseBackend::MySql).into_connection();
    let state = common::mock_app_state(db);

    state.set_scan_running("bands", true).await;
    state.set_scan_running("bands", false).await;
    assert!(!state.is_scan_running("bands").await);
}

#[tokio::test]
async fn test_is_any_scan_running_with_one_type() {
    let db = MockDatabase::new(DatabaseBackend::MySql).into_connection();
    let state = common::mock_app_state(db);

    state.set_scan_running("albums", true).await;
    assert!(state.is_any_scan_running().await);

    // bands is not running
    assert!(!state.is_scan_running("bands").await);
}

#[tokio::test]
async fn test_is_scan_running_for_nonexistent_type() {
    let db = MockDatabase::new(DatabaseBackend::MySql).into_connection();
    let state = common::mock_app_state(db);

    assert!(!state.is_scan_running("nonexistent").await);
}
