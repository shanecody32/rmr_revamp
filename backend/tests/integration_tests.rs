//! Integration tests that run against a real database.
//!
//! All tests are `#[ignore]` so they only run when explicitly requested:
//!   TEST_DATABASE_URL=mysql://... cargo test -- --ignored --test-threads=1
//!
//! These tests catch schema mismatches, migration regressions, and CRUD logic
//! that mock tests cannot verify.

mod common;

use sea_orm::{ConnectionTrait, DatabaseBackend, Statement, FromQueryResult};

// ─── Schema Validation ──────────────────────────────────────────────

/// Helper to check that a column exists in a table with the expected type.
#[derive(Debug, FromQueryResult)]
struct ColumnInfo {
    column_name: String,
    column_type: String,
    is_nullable: String,
    column_key: String,
    extra: String,
}

async fn get_columns(
    db: &impl ConnectionTrait,
    table: &str,
) -> Vec<ColumnInfo> {
    let sql = format!(
        "SELECT COLUMN_NAME as column_name, COLUMN_TYPE as column_type, \
         IS_NULLABLE as is_nullable, COLUMN_KEY as column_key, EXTRA as extra \
         FROM information_schema.COLUMNS WHERE TABLE_NAME = '{}' \
         ORDER BY ORDINAL_POSITION",
        table
    );
    ColumnInfo::find_by_statement(Statement::from_string(
        DatabaseBackend::MySql,
        sql,
    ))
    .all(db)
    .await
    .unwrap_or_default()
}

fn assert_column_exists(columns: &[ColumnInfo], name: &str, table: &str) {
    assert!(
        columns.iter().any(|c| c.column_name == name),
        "Column '{}' not found in table '{}'. Columns: {:?}",
        name,
        table,
        columns.iter().map(|c| &c.column_name).collect::<Vec<_>>()
    );
}

#[tokio::test]
#[ignore]
async fn test_staff_playlists_schema() {
    let db = common::setup_test_db().await.unwrap();
    let cols = get_columns(&db, "staff_playlists").await;

    // The id column should exist
    assert_column_exists(&cols, "id", "staff_playlists");

    let id_col = cols.iter().find(|c| c.column_name == "id").unwrap();
    // Should have auto_increment
    assert!(
        id_col.extra.contains("auto_increment"),
        "staff_playlists.id should have auto_increment, got extra='{}'",
        id_col.extra
    );
    // Should be a primary key
    assert!(
        id_col.column_key == "PRI",
        "staff_playlists.id should be PRIMARY KEY, got column_key='{}'",
        id_col.column_key
    );
}

#[tokio::test]
#[ignore]
async fn test_band_aliases_has_phonetic_columns() {
    let db = common::setup_test_db().await.unwrap();
    let cols = get_columns(&db, "band_aliases").await;

    for col_name in &[
        "slug",
        "sanitized_name",
        "soundex_key",
        "metaphone_key",
        "dmetaphone_key",
        "dmetaphone_alt_key",
    ] {
        assert_column_exists(&cols, col_name, "band_aliases");
    }
}

#[tokio::test]
#[ignore]
async fn test_album_aliases_has_phonetic_columns() {
    let db = common::setup_test_db().await.unwrap();
    let cols = get_columns(&db, "album_aliases").await;

    for col_name in &[
        "slug",
        "sanitized_name",
        "soundex_key",
        "metaphone_key",
        "dmetaphone_key",
        "dmetaphone_alt_key",
    ] {
        assert_column_exists(&cols, col_name, "album_aliases");
    }
}

#[tokio::test]
#[ignore]
async fn test_song_aliases_has_phonetic_columns() {
    let db = common::setup_test_db().await.unwrap();
    let cols = get_columns(&db, "song_aliases").await;

    for col_name in &[
        "slug",
        "sanitized_name",
        "soundex_key",
        "metaphone_key",
        "dmetaphone_key",
        "dmetaphone_alt_key",
    ] {
        assert_column_exists(&cols, col_name, "song_aliases");
    }
}

#[tokio::test]
#[ignore]
async fn test_bands_table_has_expected_columns() {
    let db = common::setup_test_db().await.unwrap();
    let cols = get_columns(&db, "bands").await;

    // Core columns
    for col_name in &["id", "name", "slug", "city_id", "country_id", "state_id"] {
        assert_column_exists(&cols, col_name, "bands");
    }
}

#[tokio::test]
#[ignore]
async fn test_albums_table_has_expected_columns() {
    let db = common::setup_test_db().await.unwrap();
    let cols = get_columns(&db, "albums").await;

    for col_name in &["id", "name", "slug", "band_id", "label_id"] {
        assert_column_exists(&cols, col_name, "albums");
    }
}

#[tokio::test]
#[ignore]
async fn test_songs_table_has_expected_columns() {
    let db = common::setup_test_db().await.unwrap();
    let cols = get_columns(&db, "songs").await;

    for col_name in &["id", "name", "slug", "band_id", "album_id"] {
        assert_column_exists(&cols, col_name, "songs");
    }
}

// ─── CRUD Round-trip Tests ──────────────────────────────────────────

#[tokio::test]
#[ignore]
async fn test_genre_crud_round_trip() {
    let db = common::setup_test_db().await.unwrap();

    // Read genres — should return at least some data
    use backend::services::genre_service::GenreService;
    let genres = GenreService::get_genres(&db).await.unwrap();
    assert!(!genres.is_empty(), "Database should have at least one genre");

    // Get sub_genres for the first genre
    let genre_id = genres[0].id;
    let sub_genres = GenreService::get_sub_genres_by_genre(&db, genre_id).await.unwrap();
    // Sub-genres may or may not exist, just verify no error
    let _ = sub_genres;
}

#[tokio::test]
#[ignore]
async fn test_location_crud_round_trip() {
    let db = common::setup_test_db().await.unwrap();

    use backend::services::location_service::LocationService;
    let countries = LocationService::get_countries(&db).await.unwrap();
    assert!(!countries.is_empty(), "Database should have at least one country");

    // Verify we can look up by id
    let country = LocationService::get_country_by_id(&db, countries[0].id).await.unwrap();
    assert!(country.is_some());
    assert_eq!(country.unwrap().id, countries[0].id);
}

// ─── Similarity Search Integration ──────────────────────────────────

#[tokio::test]
#[ignore]
async fn test_band_similarity_search() {
    let db = common::setup_test_db().await.unwrap();

    use backend::services::types::SimilarityParams;
    use backend::services::BandService;

    // Search for a common name — should not error even if no matches
    let params = SimilarityParams {
        search_term: "Willie Nelson".to_string(),
        min_similarity: Some(40),
        jw_weight: Some(0.5),
        dice_weight: Some(0.5),
        ..Default::default()
    };

    let results = BandService::get_similar_bands(&db, params).await;
    // Just verify the query executes without error
    assert!(results.is_ok(), "Similarity search should not error: {:?}", results.err());
}
