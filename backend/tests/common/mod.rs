//! Common test utilities and fixtures.
//!
//! This module provides shared test infrastructure including:
//! - Database connection setup for integration tests
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
