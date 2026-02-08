//! Tests for SimilarityScope::from(&SimilarityParams)

use backend::services::types::SimilarityParams;
use backend::utils::similarity::scope::SimilarityScope;

#[test]
fn test_empty_params_all_none() {
    let params = SimilarityParams::default();
    let scope = SimilarityScope::from(&params);

    assert!(scope.band_id.is_none());
    assert!(scope.album_id.is_none());
    assert!(scope.radio_station_id.is_none());
    assert!(scope.country_id.is_none());
    assert!(scope.state_id.is_none());
    assert!(scope.city_id.is_none());
    assert!(scope.postal_code_id.is_none());
    assert!(!scope.restrict_to_parent);
}

#[test]
fn test_full_params_all_populated() {
    let params = SimilarityParams {
        search_term: "test".to_string(),
        band_id: Some(1),
        album_id: Some(2),
        radio_station_id: Some(3),
        country_id: Some(4),
        state_id: Some(5),
        city_id: Some(6),
        postal_code_id: Some(7),
        restrict_to_parent: Some(true),
        ..Default::default()
    };
    let scope = SimilarityScope::from(&params);

    assert_eq!(scope.band_id, Some(1));
    assert_eq!(scope.album_id, Some(2));
    assert_eq!(scope.radio_station_id, Some(3));
    assert_eq!(scope.country_id, Some(4));
    assert_eq!(scope.state_id, Some(5));
    assert_eq!(scope.city_id, Some(6));
    assert_eq!(scope.postal_code_id, Some(7));
    assert!(scope.restrict_to_parent);
}

#[test]
fn test_restrict_to_parent_none_is_false() {
    let params = SimilarityParams {
        restrict_to_parent: None,
        ..Default::default()
    };
    let scope = SimilarityScope::from(&params);
    assert!(!scope.restrict_to_parent);
}

#[test]
fn test_restrict_to_parent_some_true() {
    let params = SimilarityParams {
        restrict_to_parent: Some(true),
        ..Default::default()
    };
    let scope = SimilarityScope::from(&params);
    assert!(scope.restrict_to_parent);
}

#[test]
fn test_restrict_to_parent_some_false() {
    let params = SimilarityParams {
        restrict_to_parent: Some(false),
        ..Default::default()
    };
    let scope = SimilarityScope::from(&params);
    assert!(!scope.restrict_to_parent);
}

#[test]
fn test_partial_band_and_country_only() {
    let params = SimilarityParams {
        band_id: Some(42),
        country_id: Some(99),
        ..Default::default()
    };
    let scope = SimilarityScope::from(&params);

    assert_eq!(scope.band_id, Some(42));
    assert_eq!(scope.country_id, Some(99));
    assert!(scope.album_id.is_none());
    assert!(scope.radio_station_id.is_none());
    assert!(scope.state_id.is_none());
    assert!(scope.city_id.is_none());
    assert!(scope.postal_code_id.is_none());
}

#[test]
fn test_only_location_params() {
    let params = SimilarityParams {
        country_id: Some(1),
        state_id: Some(2),
        city_id: Some(3),
        postal_code_id: Some(4),
        ..Default::default()
    };
    let scope = SimilarityScope::from(&params);

    assert!(scope.band_id.is_none());
    assert!(scope.album_id.is_none());
    assert!(scope.radio_station_id.is_none());
    assert_eq!(scope.country_id, Some(1));
    assert_eq!(scope.state_id, Some(2));
    assert_eq!(scope.city_id, Some(3));
    assert_eq!(scope.postal_code_id, Some(4));
}

#[test]
fn test_only_entity_params() {
    let params = SimilarityParams {
        band_id: Some(10),
        album_id: Some(20),
        radio_station_id: Some(30),
        ..Default::default()
    };
    let scope = SimilarityScope::from(&params);

    assert_eq!(scope.band_id, Some(10));
    assert_eq!(scope.album_id, Some(20));
    assert_eq!(scope.radio_station_id, Some(30));
    assert!(scope.country_id.is_none());
    assert!(scope.state_id.is_none());
    assert!(scope.city_id.is_none());
    assert!(scope.postal_code_id.is_none());
}
