//! Tests for duplicate scan types, GenericCandidate From impls, and ScanEntityType parsing.

use backend::services::duplicate_scan_service::{GenericCandidate, CandidateFilterParams};
use backend::models::duplicate_scan_state::ScanEntityType;

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
