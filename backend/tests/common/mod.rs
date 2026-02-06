//! Common test utilities and fixtures.
//!
//! This module provides shared test infrastructure including:
//! - Database connection setup for integration tests
//! - Mock app state for service tests
//! - Test fixtures and factories
//! - Helper assertions

use sea_orm::{Database, DatabaseConnection, DbErr};
use std::env;

/// Set up a test database connection.
///
/// Uses the TEST_DATABASE_URL environment variable, falling back to DATABASE_URL.
/// For true isolation, consider using a separate test database or transactions.
pub async fn setup_test_db() -> Result<DatabaseConnection, DbErr> {
    dotenvy::dotenv().ok();

    let db_url = env::var("TEST_DATABASE_URL")
        .or_else(|_| env::var("DATABASE_URL"))
        .expect("TEST_DATABASE_URL or DATABASE_URL must be set for integration tests");

    Database::connect(&db_url).await
}

/// Run a test with a database connection, rolling back any changes.
///
/// This is useful for tests that modify data but shouldn't affect other tests.
#[allow(dead_code)]
pub async fn with_test_db<F, Fut, T>(test_fn: F) -> T
where
    F: FnOnce(DatabaseConnection) -> Fut,
    Fut: std::future::Future<Output = T>,
{
    let db = setup_test_db().await.expect("Failed to connect to test database");
    test_fn(db).await
}

/// Build a minimal AppState for testing using any DatabaseConnection (real or mock).
#[allow(dead_code)]
pub fn mock_app_state(db: DatabaseConnection) -> backend::job_state::AppState {
    use std::sync::Arc;
    use tokio::sync::RwLock;
    use std::collections::HashMap;
    use backend::config::StaticFileConfig;

    backend::job_state::AppState {
        db,
        backfill_job_state: Arc::new(RwLock::new(Default::default())),
        album_genre_update_job_state: Arc::new(RwLock::new(Default::default())),
        duplicate_scans_running: Arc::new(RwLock::new(HashMap::new())),
        duplicate_scan_tokens: Arc::new(RwLock::new(HashMap::new())),
        static_config: StaticFileConfig::from_env(),
        http_client: reqwest::Client::new(),
    }
}

/// Run a test inside a transaction that is rolled back on completion.
///
/// This prevents test data from polluting the database.
/// The closure receives a `DatabaseTransaction` which implements `ConnectionTrait`.
#[allow(dead_code)]
pub async fn with_transaction<F, Fut, T>(test_fn: F) -> T
where
    F: FnOnce(sea_orm::DatabaseTransaction) -> Fut,
    Fut: std::future::Future<Output = T>,
{
    use sea_orm::TransactionTrait;

    let db = setup_test_db().await.expect("Failed to connect to test database");
    let txn = db.begin().await.expect("Failed to start transaction");
    let result = test_fn(txn).await;
    // Transaction is dropped without commit, so it rolls back automatically
    result
}
