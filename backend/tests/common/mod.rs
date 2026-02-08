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

// ─── Test Fixtures ──────────────────────────────────────────────────

/// Create a test GenreModel with minimal fields.
#[allow(dead_code)]
pub fn make_test_genre(id: u32, name: &str) -> backend::models::genres::Model {
    backend::models::genres::Model {
        id,
        name: Some(name.to_string()),
        slug: Some(name.to_lowercase().replace(' ', "-")),
        chart: 1,
    }
}

/// Create a test SubGenreModel with minimal fields.
#[allow(dead_code)]
pub fn make_test_sub_genre(id: u32, genre_id: u32, name: &str) -> backend::models::sub_genres::Model {
    backend::models::sub_genres::Model {
        id,
        genre_id: Some(genre_id),
        name: Some(name.to_string()),
        slug: Some(name.to_lowercase().replace(' ', "-")),
        chart: 1,
        default: 0,
        created: None,
        modified: None,
    }
}

/// Create a test CountryModel with minimal fields.
#[allow(dead_code)]
pub fn make_test_country(id: u32, name: &str) -> backend::models::countries::Model {
    backend::models::countries::Model {
        id,
        name: Some(name.to_string()),
        slug: Some(name.to_lowercase().replace(' ', "-")),
        continent: None,
        region: None,
        iso_three_digit: None,
        iso_two_digit: None,
        phone_reg_exp: None,
        phone_format: None,
        phone_code: None,
        address_format: None,
        chart: 1,
    }
}

/// Create a test UserModel with minimal fields.
#[allow(dead_code)]
pub fn make_test_user(id: u32, email: &str) -> backend::models::users::Model {
    backend::models::users::Model {
        id,
        role_id: 1,
        username: Some(email.to_string()),
        email: Some(email.to_string()),
        password: "hashed".to_string(),
        first_name: Some("Test".to_string()),
        last_name: Some("User".to_string()),
        referred_by: None,
        promocode: None,
        signup_ip: None,
        last_login_ip: None,
        geo_ip_country_code: None,
        primary_phone: None,
        agreed_to_terms: 1,
        agreed_to_pricing: 1,
        activated: 1,
        sub_uuid: None,
        term: 0,
        pay_by_check: 0,
        exp: None,
        radio_control: None,
        created: None,
        modified: None,
    }
}

/// Create a test StateModel with minimal fields.
#[allow(dead_code)]
pub fn make_test_state(id: u32, country_id: u32, name: &str) -> backend::models::states::Model {
    backend::models::states::Model {
        id,
        country_id: Some(country_id),
        name: Some(name.to_string()),
        slug: Some(name.to_lowercase().replace(' ', "-")),
        abbrv: None,
        chart: 1,
        new: 0,
        correct: 0,
        created: None,
        modified: None,
    }
}

/// Create a test CityModel with minimal fields.
#[allow(dead_code)]
pub fn make_test_city(id: u32, state_id: u32, name: &str) -> backend::models::cities::Model {
    backend::models::cities::Model {
        id,
        country_id: None,
        state_id: Some(state_id),
        name: Some(name.to_string()),
        slug: Some(name.to_lowercase().replace(' ', "-")),
        new: 0,
        created: None,
        modified: None,
    }
}

/// Create a test BandModel with minimal fields.
#[allow(dead_code)]
pub fn make_test_band(id: u32, name: &str) -> backend::models::bands::Model {
    backend::models::bands::Model {
        id,
        city_id: None,
        country_id: None,
        state_id: None,
        name: name.to_string(),
        slug: Some(name.to_lowercase().replace(' ', "-")),
        website: None,
        email: None,
        twitter: None,
        facebook_url: None,
        lastfm_url: None,
        myspace_url: None,
        bandcamp_url: None,
        wikipedia_url: None,
        cdbaby_url: None,
        youtube_url: None,
        reverb_url: None,
        itunes_url: None,
        instagram_url: None,
        pinterest_url: None,
        itunes_id: None,
        amg_id: None,
        rovi_id: None,
        echo_id: None,
        seven_digital_id: None,
        discogs_id: None,
        spotify_id: None,
        rdio_id: None,
        rss_feed: None,
        bio: None,
        verified: 0,
        verified_by: None,
        approved: 0,
        approved_by: None,
        reviewed_by: None,
        hot_download: 0,
        created: None,
        modified: None,
        band_type: "artist".to_string(),
        data_status: "new".to_string(),
        data_status_reason: None,
        data_status_note: None,
        data_status_at: None,
        data_status_by: None,
        chart_status: "pending".to_string(),
        chart_denial_reason: None,
        chart_status_note: None,
        chart_status_at: None,
        chart_status_by: None,
    }
}

/// Create a test AlbumModel with minimal fields.
#[allow(dead_code)]
pub fn make_test_album(id: u32, name: &str) -> backend::models::albums::Model {
    backend::models::albums::Model {
        id,
        label_id: None,
        name: Some(name.to_string()),
        slug: Some(name.to_lowercase().replace(' ', "-")),
        release_date: None,
        about: None,
        thanks: None,
        producer: None,
        engineer: None,
        studio: None,
        master: None,
        itunes_url: None,
        cdbaby_url: None,
        amazon_url: None,
        img: None,
        itunes_id: None,
        rovi_id: None,
        sub_genre_for_charting: None,
        genre_admin_set: 0,
        compilation: 0,
        soundtrack: 0,
        approved: 0,
        approved_by: None,
        verified: 0,
        verified_by: None,
        created: None,
        modified: None,
        format: "lp".to_string(),
        data_status: "new".to_string(),
        data_status_reason: None,
        data_status_note: None,
        data_status_at: None,
        data_status_by: None,
        chart_status: "pending".to_string(),
        chart_denial_reason: None,
        chart_status_note: None,
        chart_status_at: None,
        chart_status_by: None,
    }
}

/// Create a test SongModel with minimal fields.
#[allow(dead_code)]
pub fn make_test_song(id: u32, band_id: u32, name: &str) -> backend::models::songs::Model {
    backend::models::songs::Model {
        id,
        band_id: Some(band_id),
        sub_genre_id: None,
        name: Some(name.to_string()),
        slug: Some(name.to_lowercase().replace(' ', "-")),
        lyrics: None,
        lyrics_writer: None,
        music_writer: None,
        license: None,
        publisher: None,
        length: 0,
        release_date: None,
        itunes_url: None,
        itunes_img: None,
        itunes_preview: None,
        itunes_id: None,
        rovi_id: None,
        echo_id: None,
        verified: 0,
        verified_by: None,
        approved: 0,
        approved_by: None,
        created: None,
        modified: None,
        version_type: "original".to_string(),
        original_song_id: None,
        data_status: "new".to_string(),
        data_status_reason: None,
        data_status_note: None,
        data_status_at: None,
        data_status_by: None,
        chart_status: "pending".to_string(),
        chart_denial_reason: None,
        chart_status_note: None,
        chart_status_at: None,
        chart_status_by: None,
    }
}

/// Create a test AlbumImageModel with minimal fields.
#[allow(dead_code)]
pub fn make_test_album_image(id: u32, album_id: u32, path: &str) -> backend::models::album_images::Model {
    backend::models::album_images::Model {
        id,
        album_id: Some(album_id),
        path: Some(path.to_string()),
        filename: Some(path.to_string()),
        thumbname: None,
        created: None,
        modified: None,
    }
}

/// Create a test LabelModel with minimal fields.
#[allow(dead_code)]
pub fn make_test_label(id: u32, name: &str) -> backend::models::labels::Model {
    backend::models::labels::Model {
        id,
        name: Some(name.to_string()),
        slug: Some(name.to_lowercase().replace(' ', "-")),
        created: None,
        modified: None,
    }
}

/// Create a test RadioStationModel with minimal fields.
#[allow(dead_code)]
pub fn make_test_radio_station(id: u32, name: &str) -> backend::models::radio_stations::Model {
    backend::models::radio_stations::Model {
        id,
        name: Some(name.to_string()),
        slug: Some(name.to_lowercase().replace(' ', "-")),
        r#type: Some("terrestrial".to_string()),
        info: None,
        approved: 0,
        verified: 0,
        automatic: 0,
        active: 1,
        influence: 0.0,
        no_show: 0,
        imported_from_file: 0,
        created: None,
        modified: None,
        data_status: "new".to_string(),
        data_status_reason: None,
        data_status_note: None,
        data_status_at: None,
        data_status_by: None,
        chart_status: "pending".to_string(),
        chart_denial_reason: None,
        chart_status_note: None,
        chart_status_at: None,
        chart_status_by: None,
    }
}

/// Create a test StaffMemberModel with minimal fields.
#[allow(dead_code)]
pub fn make_test_staff_member(
    id: u32,
    radio_station_id: Option<u32>,
    first_name: &str,
    last_name: &str,
) -> backend::models::staff_members::Model {
    backend::models::staff_members::Model {
        id,
        radio_station_id,
        user_id: None,
        orig_username: None,
        first_name: Some(first_name.to_string()),
        last_name: Some(last_name.to_string()),
        slug: None,
        on_air_name: None,
        position: None,
        email: None,
        show_name: None,
        start_time: None,
        end_time: None,
        days_on: None,
        bio: None,
        show_description: None,
        has_playlist: 0,
        applied: 0,
        approved: 0,
        verified: 0,
        automatic: 0,
        playlist_finalised: 0,
        reported: 0,
        lw_reported: 0,
        last_reported: None,
        station_control: 0,
        spotlight: 0,
        imported_from_file: 0,
        archived: 0,
        archived_at: None,
        archived_reason: None,
        transferred_to_id: None,
        transferred_from_id: None,
        admin_editable: 0,
        created: None,
        modified: None,
        data_status: "new".to_string(),
        data_status_reason: None,
        data_status_note: None,
        data_status_at: None,
        data_status_by: None,
        chart_status: "pending".to_string(),
        chart_denial_reason: None,
        chart_status_note: None,
        chart_status_at: None,
        chart_status_by: None,
    }
}

/// Create a test StaffPlaylistModel with minimal fields.
#[allow(dead_code)]
pub fn make_test_staff_playlist(id: u32, staff_member_id: u32) -> backend::models::staff_playlists::Model {
    backend::models::staff_playlists::Model {
        id,
        staff_member_id: Some(staff_member_id),
        band_id: None,
        song_id: None,
        album_id: None,
        user_id: None,
        spins: None,
        invalid: 0,
        created: None,
        modified: None,
    }
}

/// Create a test StaffPlaylistArchiveModel with minimal fields.
#[allow(dead_code)]
pub fn make_test_staff_playlist_archive(id: u32, staff_member_id: u32) -> backend::models::staff_playlist_archives::Model {
    backend::models::staff_playlist_archives::Model {
        id,
        staff_member_id: Some(staff_member_id),
        band_id: None,
        song_id: None,
        album_id: None,
        user_id: None,
        spins: None,
        invalid: 0,
        week_ending: None,
        created: None,
        modified: None,
    }
}

/// Create a test BandAliasModel with minimal fields.
#[allow(dead_code)]
pub fn make_test_band_alias(id: u32, band_id: u32, name: &str) -> backend::models::band_aliases::Model {
    backend::models::band_aliases::Model {
        id,
        band_id,
        radio_station_id: None,
        alias_key: name.to_string(),
        slug: Some(name.to_lowercase().replace(' ', "-")),
        sanitized_name: Some(name.to_lowercase()),
        soundex_key: None,
        phonetic_key: None,
        metaphone_key: None,
        dmetaphone_key: None,
        dmetaphone_alt_key: None,
        created: None,
        modified: None,
    }
}

/// Create a test StateAliasModel with minimal fields.
#[allow(dead_code)]
pub fn make_test_state_alias(id: u32, state_id: u32, name: &str) -> backend::models::state_aliases::Model {
    backend::models::state_aliases::Model {
        id,
        state_id,
        country_id: None,
        name: name.to_string(),
        slug: Some(name.to_lowercase().replace(' ', "-")),
        sanitized_name: Some(name.to_lowercase()),
        soundex_key: None,
        phonetic_key: None,
        metaphone_key: None,
        dmetaphone_key: None,
        dmetaphone_alt_key: None,
        created: None,
        modified: None,
    }
}

/// Create a test BandImageModel with minimal fields.
#[allow(dead_code)]
pub fn make_test_band_image(id: u32, band_id: u32) -> backend::models::band_images::Model {
    backend::models::band_images::Model {
        id,
        band_id: Some(band_id),
        path: Some("img/bands".to_string()),
        filename: Some(format!("band_{}.jpg", band_id)),
        thumbname: None,
        order: None,
        created: None,
        modified: None,
    }
}

/// Create a test AlbumsBandsModel with minimal fields.
#[allow(dead_code)]
pub fn make_test_albums_bands(id: u32, album_id: u32, band_id: u32) -> backend::models::albums_bands::Model {
    backend::models::albums_bands::Model {
        id,
        album_id: Some(album_id),
        band_id: Some(band_id),
    }
}

/// Create a test AlbumsSongsModel with minimal fields.
#[allow(dead_code)]
pub fn make_test_albums_songs(id: u32, album_id: u32, song_id: u32) -> backend::models::albums_songs::Model {
    backend::models::albums_songs::Model {
        id,
        album_id,
        song_id,
        track_num: Some(1),
        disc_count: None,
        disc_number: Some(1),
        track_count: None,
        track_number: Some(1),
    }
}

/// Create a test BandsSubGenresModel with minimal fields.
#[allow(dead_code)]
pub fn make_test_bands_sub_genres(id: u32, band_id: u32, sub_genre_id: u32) -> backend::models::bands_sub_genres::Model {
    backend::models::bands_sub_genres::Model {
        id,
        band_id: Some(band_id),
        sub_genre_id: Some(sub_genre_id),
    }
}

/// Create a test BandDuplicateCandidateModel with minimal fields.
#[allow(dead_code)]
pub fn make_test_band_duplicate_candidate(
    id: u32,
    band_id_1: u32,
    band_id_2: u32,
    score: i32,
) -> backend::models::band_duplicate_candidates::Model {
    backend::models::band_duplicate_candidates::Model {
        id,
        band_id_1,
        band_id_2,
        similarity_score: score,
        match_reasons: None,
        status: "pending".to_string(),
        reviewed_by: None,
        reviewed_at: None,
        detected_at: chrono::NaiveDateTime::default(),
        scan_settings: None,
    }
}

/// Create a test SongDuplicateCandidateModel with minimal fields.
#[allow(dead_code)]
pub fn make_test_song_duplicate_candidate(
    id: u32,
    song_id_1: u32,
    song_id_2: u32,
    score: i32,
) -> backend::models::song_duplicate_candidates::Model {
    backend::models::song_duplicate_candidates::Model {
        id,
        song_id_1,
        song_id_2,
        similarity_score: score,
        match_reasons: None,
        status: "pending".to_string(),
        reviewed_by: None,
        reviewed_at: None,
        detected_at: chrono::NaiveDateTime::default(),
        scan_settings: None,
    }
}

/// Create a test AlbumAliasModel with minimal fields.
#[allow(dead_code)]
pub fn make_test_album_alias(id: u32, album_id: u32, band_id: u32, name: &str) -> backend::models::album_aliases::Model {
    backend::models::album_aliases::Model {
        id,
        album_id,
        band_id,
        radio_station_id: None,
        alias_key: name.to_string(),
        slug: Some(name.to_lowercase().replace(' ', "-")),
        sanitized_name: Some(name.to_lowercase()),
        soundex_key: None,
        phonetic_key: None,
        metaphone_key: None,
        dmetaphone_key: None,
        dmetaphone_alt_key: None,
        created: None,
        modified: None,
    }
}

/// Create a test SongAliasModel with minimal fields.
#[allow(dead_code)]
pub fn make_test_song_alias(id: u32, song_id: u32, band_id: u32, name: &str) -> backend::models::song_aliases::Model {
    backend::models::song_aliases::Model {
        id,
        song_id,
        band_id,
        radio_station_id: None,
        alias_key: name.to_string(),
        slug: Some(name.to_lowercase().replace(' ', "-")),
        sanitized_name: Some(name.to_lowercase()),
        soundex_key: None,
        phonetic_key: None,
        metaphone_key: None,
        dmetaphone_key: None,
        dmetaphone_alt_key: None,
        created: None,
        modified: None,
    }
}

/// Create a test LabelAliasModel with minimal fields.
#[allow(dead_code)]
pub fn make_test_label_alias(id: u32, label_id: u32, name: &str) -> backend::models::label_aliases::Model {
    backend::models::label_aliases::Model {
        id,
        label_id,
        radio_station_id: None,
        alias_key: name.to_string(),
        slug: Some(name.to_lowercase().replace(' ', "-")),
        sanitized_name: Some(name.to_lowercase()),
        soundex_key: None,
        phonetic_key: None,
        metaphone_key: None,
        dmetaphone_key: None,
        dmetaphone_alt_key: None,
        created: None,
        modified: None,
    }
}

/// Create a test AlbumsSubGenresModel with minimal fields.
#[allow(dead_code)]
pub fn make_test_albums_sub_genres(id: u32, album_id: u32, sub_genre_id: u32) -> backend::models::albums_sub_genres::Model {
    backend::models::albums_sub_genres::Model {
        id,
        album_id: Some(album_id),
        sub_genre_id: Some(sub_genre_id),
    }
}

/// Create a test ActionLogModel with minimal fields.
#[allow(dead_code)]
pub fn make_test_action_log(
    id: u32,
    action_type: &str,
    entity_type: &str,
    entity_id: u32,
) -> backend::models::action_logs::Model {
    backend::models::action_logs::Model {
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
