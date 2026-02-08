//! Tests for StatusService — chart approval validation and data status updates.
//!
//! These are the highest-priority tests: the duplicate_detected → chart approval
//! block is critical business logic.

use sea_orm::{DatabaseBackend, MockDatabase, MockExecResult};
use backend::services::status_service::{
    StatusService, DataStatusUpdate, ChartStatusUpdate,
    chart_status, data_status,
};
use backend::models::bands::Model as BandModel;
use backend::models::albums::Model as AlbumModel;
use backend::models::songs::Model as SongModel;
use backend::models::action_logs::Model as ActionLogModel;

fn make_band(id: u32, data_stat: &str, chart_stat: &str) -> BandModel {
    BandModel {
        id,
        city_id: None,
        country_id: None,
        state_id: None,
        name: "Test Band".to_string(),
        slug: Some("test-band".to_string()),
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
        data_status: data_stat.to_string(),
        data_status_reason: None,
        data_status_note: None,
        data_status_at: None,
        data_status_by: None,
        chart_status: chart_stat.to_string(),
        chart_denial_reason: None,
        chart_status_note: None,
        chart_status_at: None,
        chart_status_by: None,
    }
}

fn make_album(id: u32, data_stat: &str, chart_stat: &str) -> AlbumModel {
    AlbumModel {
        id,
        label_id: None,
        name: Some("Test Album".to_string()),
        slug: Some("test-album".to_string()),
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
        data_status: data_stat.to_string(),
        data_status_reason: None,
        data_status_note: None,
        data_status_at: None,
        data_status_by: None,
        chart_status: chart_stat.to_string(),
        chart_denial_reason: None,
        chart_status_note: None,
        chart_status_at: None,
        chart_status_by: None,
    }
}

fn make_song(id: u32, data_stat: &str, chart_stat: &str) -> SongModel {
    SongModel {
        id,
        band_id: None,
        sub_genre_id: None,
        name: Some("Test Song".to_string()),
        slug: Some("test-song".to_string()),
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
        data_status: data_stat.to_string(),
        data_status_reason: None,
        data_status_note: None,
        data_status_at: None,
        data_status_by: None,
        chart_status: chart_stat.to_string(),
        chart_denial_reason: None,
        chart_status_note: None,
        chart_status_at: None,
        chart_status_by: None,
    }
}

fn make_action_log(id: u32) -> ActionLogModel {
    ActionLogModel {
        id,
        action_type: "entity.chart_status_change".to_string(),
        entity_type: "band".to_string(),
        entity_id: 1,
        user_id: None,
        before_snapshot: None,
        after_snapshot: None,
        metadata: None,
        ip_address: None,
        created_at: chrono::NaiveDateTime::default(),
    }
}

// ─── Band Data Status ───────────────────────────────────────────────

#[tokio::test]
async fn test_update_band_data_status_success() {
    // Mock sequence: find_by_id(query) → update_many(exec) → insert action log(exec) → select back action log(query)
    let db = MockDatabase::new(DatabaseBackend::MySql)
        .append_query_results(vec![
            vec![make_band(1, data_status::NEW, chart_status::PENDING)],
        ])
        .append_exec_results(vec![
            MockExecResult { last_insert_id: 0, rows_affected: 1 }, // update_many
            MockExecResult { last_insert_id: 1, rows_affected: 1 }, // insert action log
        ])
        .append_query_results(vec![vec![make_action_log(1)]]) // select back action log
        .into_connection();

    let update = DataStatusUpdate {
        status: data_status::VALIDATED.to_string(),
        reason: Some("manual".to_string()),
        note: None,
    };
    let result = StatusService::update_band_data_status(&db, 1, update, Some(1), None).await;
    assert!(result.is_ok());
    let r = result.unwrap();
    assert!(r.success);
    assert!(r.message.contains("validated"));
}

#[tokio::test]
async fn test_update_band_data_status_not_found() {
    let db = MockDatabase::new(DatabaseBackend::MySql)
        .append_query_results(vec![Vec::<BandModel>::new()])
        .into_connection();

    let update = DataStatusUpdate {
        status: data_status::VALIDATED.to_string(),
        reason: None,
        note: None,
    };
    let result = StatusService::update_band_data_status(&db, 999, update, None, None).await;
    assert!(result.is_err());
}

// ─── Band Chart Status (Critical validation) ────────────────────────

#[tokio::test]
async fn test_approve_band_chart_when_validated_succeeds_no_warning() {
    let db = MockDatabase::new(DatabaseBackend::MySql)
        .append_query_results(vec![
            vec![make_band(1, data_status::VALIDATED, chart_status::PENDING)],
        ])
        .append_exec_results(vec![
            MockExecResult { last_insert_id: 0, rows_affected: 1 }, // update_many
            MockExecResult { last_insert_id: 1, rows_affected: 1 }, // insert action log
        ])
        .append_query_results(vec![vec![make_action_log(1)]]) // select back action log
        .into_connection();

    let update = ChartStatusUpdate {
        status: chart_status::APPROVED.to_string(),
        denial_reason: None,
        note: None,
    };
    let result = StatusService::update_band_chart_status(&db, 1, update, None, None).await;
    assert!(result.is_ok());
    let r = result.unwrap();
    assert!(r.success);
    assert!(r.warning.is_none());
}

#[tokio::test]
async fn test_approve_band_chart_when_duplicate_detected_is_blocked() {
    let db = MockDatabase::new(DatabaseBackend::MySql)
        .append_query_results(vec![
            vec![make_band(1, data_status::DUPLICATE_DETECTED, chart_status::PENDING)],
        ])
        .into_connection();

    let update = ChartStatusUpdate {
        status: chart_status::APPROVED.to_string(),
        denial_reason: None,
        note: None,
    };
    let result = StatusService::update_band_chart_status(&db, 1, update, None, None).await;
    assert!(result.is_err());
    let err_msg = format!("{}", result.unwrap_err());
    assert!(err_msg.contains("duplicate"));
}

#[tokio::test]
async fn test_approve_band_chart_when_new_succeeds_with_warning() {
    let db = MockDatabase::new(DatabaseBackend::MySql)
        .append_query_results(vec![
            vec![make_band(1, data_status::NEW, chart_status::PENDING)],
        ])
        .append_exec_results(vec![
            MockExecResult { last_insert_id: 0, rows_affected: 1 }, // update_many
            MockExecResult { last_insert_id: 1, rows_affected: 1 }, // insert action log
        ])
        .append_query_results(vec![vec![make_action_log(1)]]) // select back action log
        .into_connection();

    let update = ChartStatusUpdate {
        status: chart_status::APPROVED.to_string(),
        denial_reason: None,
        note: None,
    };
    let result = StatusService::update_band_chart_status(&db, 1, update, None, None).await;
    assert!(result.is_ok());
    let r = result.unwrap();
    assert!(r.success);
    assert!(r.warning.is_some());
    assert!(r.warning.unwrap().contains("not been validated"));
}

#[tokio::test]
async fn test_deny_band_chart_status_succeeds() {
    let db = MockDatabase::new(DatabaseBackend::MySql)
        .append_query_results(vec![
            vec![make_band(1, data_status::DUPLICATE_DETECTED, chart_status::PENDING)],
        ])
        .append_exec_results(vec![
            MockExecResult { last_insert_id: 0, rows_affected: 1 }, // update_many
            MockExecResult { last_insert_id: 1, rows_affected: 1 }, // insert action log
        ])
        .append_query_results(vec![vec![make_action_log(1)]]) // select back action log
        .into_connection();

    let update = ChartStatusUpdate {
        status: chart_status::DENIED.to_string(),
        denial_reason: Some("duplicate".to_string()),
        note: None,
    };
    let result = StatusService::update_band_chart_status(&db, 1, update, None, None).await;
    assert!(result.is_ok());
}

#[tokio::test]
async fn test_suspend_band_chart_status_succeeds() {
    let db = MockDatabase::new(DatabaseBackend::MySql)
        .append_query_results(vec![
            vec![make_band(1, data_status::DUPLICATE_DETECTED, chart_status::APPROVED)],
        ])
        .append_exec_results(vec![
            MockExecResult { last_insert_id: 0, rows_affected: 1 }, // update_many
            MockExecResult { last_insert_id: 1, rows_affected: 1 }, // insert action log
        ])
        .append_query_results(vec![vec![make_action_log(1)]]) // select back action log
        .into_connection();

    let update = ChartStatusUpdate {
        status: chart_status::SUSPENDED.to_string(),
        denial_reason: None,
        note: None,
    };
    let result = StatusService::update_band_chart_status(&db, 1, update, None, None).await;
    assert!(result.is_ok());
}

// ─── Cross-entity pattern: album chart blocked by duplicate ─────────

#[tokio::test]
async fn test_approve_album_chart_when_duplicate_detected_is_blocked() {
    let db = MockDatabase::new(DatabaseBackend::MySql)
        .append_query_results(vec![
            vec![make_album(1, data_status::DUPLICATE_DETECTED, chart_status::PENDING)],
        ])
        .into_connection();

    let update = ChartStatusUpdate {
        status: chart_status::APPROVED.to_string(),
        denial_reason: None,
        note: None,
    };
    let result = StatusService::update_album_chart_status(&db, 1, update, None, None).await;
    assert!(result.is_err());
    let err_msg = format!("{}", result.unwrap_err());
    assert!(err_msg.contains("duplicate"));
}

#[tokio::test]
async fn test_approve_song_chart_when_duplicate_detected_is_blocked() {
    let db = MockDatabase::new(DatabaseBackend::MySql)
        .append_query_results(vec![
            vec![make_song(1, data_status::DUPLICATE_DETECTED, chart_status::PENDING)],
        ])
        .into_connection();

    let update = ChartStatusUpdate {
        status: chart_status::APPROVED.to_string(),
        denial_reason: None,
        note: None,
    };
    let result = StatusService::update_song_chart_status(&db, 1, update, None, None).await;
    assert!(result.is_err());
}

// ─── Helper functions ───────────────────────────────────────────────

#[tokio::test]
async fn test_trigger_band_needs_review() {
    let db = MockDatabase::new(DatabaseBackend::MySql)
        .append_exec_results(vec![
            MockExecResult { last_insert_id: 0, rows_affected: 1 },
        ])
        .into_connection();

    let result = StatusService::trigger_band_needs_review(&db, 1, "album_added").await;
    assert!(result.is_ok());
}

#[tokio::test]
async fn test_trigger_album_needs_review() {
    let db = MockDatabase::new(DatabaseBackend::MySql)
        .append_exec_results(vec![
            MockExecResult { last_insert_id: 0, rows_affected: 1 },
        ])
        .into_connection();

    let result = StatusService::trigger_album_needs_review(&db, 1, "song_added").await;
    assert!(result.is_ok());
}

#[tokio::test]
async fn test_mark_duplicate_detected_band() {
    let db = MockDatabase::new(DatabaseBackend::MySql)
        .append_exec_results(vec![
            MockExecResult { last_insert_id: 0, rows_affected: 1 },
        ])
        .into_connection();

    let result = StatusService::mark_duplicate_detected(&db, "band", 42).await;
    assert!(result.is_ok());
}
