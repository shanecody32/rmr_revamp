//! Tests for duplicate scan types, GenericCandidate From impls, ScanEntityType parsing,
//! and candidate CRUD service operations.

mod common;

use backend::services::duplicate_scan_service::{GenericCandidate, CandidateFilterParams, DuplicateScanService};
use backend::models::band_duplicate_candidates::CandidateStatus;
use backend::models::duplicate_scan_state::ScanEntityType;
use sea_orm::{DatabaseBackend, MockDatabase, MockExecResult};

// ─── GenericCandidate From impls ────────────────────────────────────

mod generic_candidate_from {
    use super::*;

    fn make_datetime() -> chrono::NaiveDateTime {
        chrono::NaiveDateTime::default()
    }

    #[test]
    fn test_from_band_candidate() {
        let candidate = backend::models::band_duplicate_candidates::Model {
            id: 1,
            band_id_1: 10,
            band_id_2: 20,
            similarity_score: 95,
            match_reasons: None,
            status: "pending".to_string(),
            reviewed_by: None,
            reviewed_at: None,
            detected_at: make_datetime(),
            scan_settings: None,
        };
        let generic: GenericCandidate = candidate.into();
        assert_eq!(generic.id, 1);
        assert_eq!(generic.entity_id_1, 10);
        assert_eq!(generic.entity_id_2, 20);
        assert_eq!(generic.similarity_score, 95);
        assert_eq!(generic.status, "pending");
    }

    #[test]
    fn test_from_album_candidate() {
        let candidate = backend::models::album_duplicate_candidates::Model {
            id: 2,
            album_id_1: 100,
            album_id_2: 200,
            similarity_score: 88,
            match_reasons: Some(serde_json::json!({"slug_match": true})),
            status: "reviewed".to_string(),
            reviewed_by: Some(1),
            reviewed_at: None,
            detected_at: make_datetime(),
            scan_settings: None,
        };
        let generic: GenericCandidate = candidate.into();
        assert_eq!(generic.entity_id_1, 100);
        assert_eq!(generic.entity_id_2, 200);
        assert_eq!(generic.similarity_score, 88);
    }

    #[test]
    fn test_from_song_candidate() {
        let candidate = backend::models::song_duplicate_candidates::Model {
            id: 3,
            song_id_1: 500,
            song_id_2: 600,
            similarity_score: 92,
            match_reasons: None,
            status: "pending".to_string(),
            reviewed_by: None,
            reviewed_at: None,
            detected_at: make_datetime(),
            scan_settings: None,
        };
        let generic: GenericCandidate = candidate.into();
        assert_eq!(generic.entity_id_1, 500);
        assert_eq!(generic.entity_id_2, 600);
    }

    #[test]
    fn test_from_label_candidate() {
        let candidate = backend::models::label_duplicate_candidates::Model {
            id: 4,
            label_id_1: 30,
            label_id_2: 40,
            similarity_score: 80,
            match_reasons: None,
            status: "dismissed".to_string(),
            reviewed_by: None,
            reviewed_at: None,
            detected_at: make_datetime(),
            scan_settings: None,
        };
        let generic: GenericCandidate = candidate.into();
        assert_eq!(generic.entity_id_1, 30);
        assert_eq!(generic.entity_id_2, 40);
        assert_eq!(generic.status, "dismissed");
    }

    #[test]
    fn test_from_radio_station_candidate() {
        let candidate = backend::models::radio_station_duplicate_candidates::Model {
            id: 5,
            radio_station_id_1: 70,
            radio_station_id_2: 80,
            similarity_score: 75,
            match_reasons: None,
            status: "pending".to_string(),
            reviewed_by: None,
            reviewed_at: None,
            detected_at: make_datetime(),
            scan_settings: None,
        };
        let generic: GenericCandidate = candidate.into();
        assert_eq!(generic.entity_id_1, 70);
        assert_eq!(generic.entity_id_2, 80);
    }

    #[test]
    fn test_from_staff_member_candidate() {
        let candidate = backend::models::staff_member_duplicate_candidates::Model {
            id: 6,
            staff_member_id_1: 90,
            staff_member_id_2: 91,
            similarity_score: 99,
            match_reasons: None,
            status: "merged".to_string(),
            reviewed_by: Some(5),
            reviewed_at: Some(make_datetime()),
            detected_at: make_datetime(),
            scan_settings: None,
        };
        let generic: GenericCandidate = candidate.into();
        assert_eq!(generic.entity_id_1, 90);
        assert_eq!(generic.entity_id_2, 91);
        assert_eq!(generic.status, "merged");
        assert_eq!(generic.reviewed_by, Some(5));
    }
}

// ─── CandidateFilterParams ──────────────────────────────────────────

#[test]
fn test_candidate_filter_params_default() {
    let params = CandidateFilterParams::default();
    assert!(params.page.is_none());
    assert!(params.page_size.is_none());
    assert!(params.status.is_none());
    assert!(params.min_score.is_none());
    assert!(params.max_score.is_none());
    assert!(params.entity_id.is_none());
}

#[test]
fn test_candidate_filter_params_custom_values() {
    let params = CandidateFilterParams {
        page: Some(2),
        page_size: Some(50),
        status: Some("pending".to_string()),
        min_score: Some(80),
        max_score: Some(100),
        entity_id: Some(42),
    };
    assert_eq!(params.page, Some(2));
    assert_eq!(params.page_size, Some(50));
    assert_eq!(params.status.as_deref(), Some("pending"));
    assert_eq!(params.min_score, Some(80));
    assert_eq!(params.max_score, Some(100));
    assert_eq!(params.entity_id, Some(42));
}

// ─── ScanEntityType parsing ─────────────────────────────────────────

#[test]
fn test_scan_entity_type_valid_parsing() {
    let cases = [
        ("bands", ScanEntityType::Bands),
        ("albums", ScanEntityType::Albums),
        ("labels", ScanEntityType::Labels),
        ("radio_stations", ScanEntityType::RadioStations),
        ("staff_members", ScanEntityType::StaffMembers),
        ("songs", ScanEntityType::Songs),
    ];
    for (input, expected) in &cases {
        let parsed: ScanEntityType = input.parse().unwrap();
        assert_eq!(&parsed, expected, "Failed to parse: {}", input);
    }
}

#[test]
fn test_scan_entity_type_invalid_returns_error() {
    let result: Result<ScanEntityType, String> = "foobar".parse();
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("Unknown entity type"));
}

#[test]
fn test_scan_entity_type_display_round_trip() {
    for et in ScanEntityType::all() {
        let s = et.to_string();
        let parsed: ScanEntityType = s.parse().unwrap();
        assert_eq!(&parsed, et);
    }
}

#[test]
fn test_scan_entity_type_display_name() {
    assert_eq!(ScanEntityType::Bands.display_name(), "Bands");
    assert_eq!(ScanEntityType::Albums.display_name(), "Albums");
    assert_eq!(ScanEntityType::RadioStations.display_name(), "Radio Stations");
    assert_eq!(ScanEntityType::StaffMembers.display_name(), "Staff Members");
}

// ─── Service-Level Candidate CRUD Tests ─────────────────────────

fn exec(rows_affected: u64) -> MockExecResult {
    MockExecResult {
        last_insert_id: 0,
        rows_affected,
    }
}

mod candidate_status_tests {
    use super::*;

    #[tokio::test]
    async fn update_candidate_status_reviewed() {
        let mut candidate = common::make_test_band_duplicate_candidate(1, 10, 20, 95);
        candidate.status = "reviewed".to_string();

        let db = MockDatabase::new(DatabaseBackend::MySql)
            // E1: update exec
            .append_exec_results(vec![exec(1)])
            // Q1: update select-back
            .append_query_results(vec![vec![candidate]])
            .into_connection();

        let result = DuplicateScanService::update_candidate_status(
            &db,
            &ScanEntityType::Bands,
            1,
            CandidateStatus::Reviewed,
            Some(42),
        )
        .await;
        assert!(result.is_ok(), "update_candidate_status failed: {:?}", result.err());
    }

    #[tokio::test]
    async fn update_candidate_status_dismissed() {
        let mut candidate = common::make_test_band_duplicate_candidate(2, 30, 40, 88);
        candidate.status = "dismissed".to_string();

        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_exec_results(vec![exec(1)])
            .append_query_results(vec![vec![candidate]])
            .into_connection();

        let result = DuplicateScanService::update_candidate_status(
            &db,
            &ScanEntityType::Bands,
            2,
            CandidateStatus::Dismissed,
            None,
        )
        .await;
        assert!(result.is_ok(), "update_candidate_status dismissed failed: {:?}", result.err());
    }

    #[tokio::test]
    async fn restore_candidate_success() {
        let candidate = common::make_test_band_duplicate_candidate(1, 10, 20, 95);

        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_exec_results(vec![exec(1)])
            .append_query_results(vec![vec![candidate]])
            .into_connection();

        let result = DuplicateScanService::restore_candidate(
            &db,
            &ScanEntityType::Bands,
            1,
        )
        .await;
        assert!(result.is_ok(), "restore_candidate failed: {:?}", result.err());
    }
}

mod clear_tests {
    use super::*;

    #[tokio::test]
    async fn clear_all_candidates() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_exec_results(vec![exec(5)])
            .into_connection();

        let result = DuplicateScanService::clear_candidates(
            &db,
            &ScanEntityType::Bands,
            false,
        )
        .await;
        assert!(result.is_ok(), "clear_all_candidates failed: {:?}", result.err());
        assert_eq!(result.unwrap(), 5);
    }

    #[tokio::test]
    async fn clear_pending_only() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_exec_results(vec![exec(3)])
            .into_connection();

        let result = DuplicateScanService::clear_candidates(
            &db,
            &ScanEntityType::Bands,
            true,
        )
        .await;
        assert!(result.is_ok(), "clear_pending_only failed: {:?}", result.err());
        assert_eq!(result.unwrap(), 3);
    }
}

mod match_tests {
    use super::*;

    #[tokio::test]
    async fn get_matches_found() {
        let c1 = common::make_test_band_duplicate_candidate(1, 10, 20, 95);
        let c2 = common::make_test_band_duplicate_candidate(2, 10, 30, 88);

        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_query_results(vec![vec![c1, c2]])
            .into_connection();

        let result = DuplicateScanService::get_entity_matches(
            &db,
            &ScanEntityType::Bands,
            10,
        )
        .await;
        assert!(result.is_ok(), "get_matches_found failed: {:?}", result.err());
        let matches = result.unwrap();
        assert_eq!(matches.len(), 2);
        assert_eq!(matches[0].entity_id_1, 10);
        assert_eq!(matches[0].entity_id_2, 20);
        assert_eq!(matches[0].similarity_score, 95);
    }

    #[tokio::test]
    async fn get_matches_empty() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_query_results(vec![Vec::<backend::models::band_duplicate_candidates::Model>::new()])
            .into_connection();

        let result = DuplicateScanService::get_entity_matches(
            &db,
            &ScanEntityType::Bands,
            999,
        )
        .await;
        assert!(result.is_ok(), "get_matches_empty failed: {:?}", result.err());
        assert!(result.unwrap().is_empty());
    }

    #[tokio::test]
    async fn get_matches_different_entity_type() {
        let c1 = common::make_test_song_duplicate_candidate(1, 100, 200, 92);

        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_query_results(vec![vec![c1]])
            .into_connection();

        let result = DuplicateScanService::get_entity_matches(
            &db,
            &ScanEntityType::Songs,
            100,
        )
        .await;
        assert!(result.is_ok(), "get_matches songs failed: {:?}", result.err());
        let matches = result.unwrap();
        assert_eq!(matches.len(), 1);
        assert_eq!(matches[0].entity_id_1, 100);
        assert_eq!(matches[0].entity_id_2, 200);
        assert_eq!(matches[0].similarity_score, 92);
    }
}
