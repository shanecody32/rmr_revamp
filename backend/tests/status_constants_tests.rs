//! Tests that status constant strings are unique (catches copy-paste bugs).

use std::collections::HashSet;

use backend::services::status_service::{
    chart_denial_reason, chart_status, data_status, data_status_reason,
};
use backend::models::action_logs::{action_types, entity_types};

#[test]
fn test_data_status_values_are_unique() {
    let values = [
        data_status::NEW,
        data_status::VALIDATED,
        data_status::NEEDS_REVIEW,
        data_status::DUPLICATE_DETECTED,
    ];
    let set: HashSet<&str> = values.iter().copied().collect();
    assert_eq!(set.len(), values.len(), "Duplicate data_status values detected: {:?}", values);
}

#[test]
fn test_chart_status_values_are_unique() {
    let values = [
        chart_status::PENDING,
        chart_status::APPROVED,
        chart_status::DENIED,
        chart_status::SUSPENDED,
    ];
    let set: HashSet<&str> = values.iter().copied().collect();
    assert_eq!(set.len(), values.len(), "Duplicate chart_status values detected: {:?}", values);
}

#[test]
fn test_chart_denial_reason_values_are_unique() {
    let values = [
        chart_denial_reason::DUPLICATE,
        chart_denial_reason::TERMS_VIOLATION,
        chart_denial_reason::EDITORIAL,
        chart_denial_reason::SPAM,
        chart_denial_reason::OTHER,
    ];
    let set: HashSet<&str> = values.iter().copied().collect();
    assert_eq!(set.len(), values.len(), "Duplicate chart_denial_reason values detected: {:?}", values);
}

#[test]
fn test_data_status_reason_values_are_unique() {
    let values = [
        data_status_reason::MANUAL,
        data_status_reason::ALBUM_ADDED,
        data_status_reason::SONG_ADDED,
        data_status_reason::MERGE,
        data_status_reason::TRANSFER,
        data_status_reason::DUPLICATE_SCAN,
    ];
    let set: HashSet<&str> = values.iter().copied().collect();
    assert_eq!(set.len(), values.len(), "Duplicate data_status_reason values detected: {:?}", values);
}

#[test]
fn test_action_types_are_unique() {
    let values = [
        action_types::STAFF_MERGE,
        action_types::STAFF_TRANSFER,
        action_types::STAFF_ARCHIVE,
        action_types::STAFF_UNARCHIVE,
        action_types::STAFF_ADMIN_EDIT,
        action_types::BAND_MERGE,
        action_types::ALBUM_MERGE,
        action_types::SONG_MERGE,
        action_types::RADIO_STATION_MERGE,
        action_types::LABEL_MERGE,
        action_types::SONG_TRANSFER_ALBUM,
        action_types::SONG_TRANSFER_BAND,
        action_types::SONG_REMOVE_FROM_ALBUM,
        action_types::ALBUM_TRANSFER_BAND,
        action_types::DATA_STATUS_CHANGE,
        action_types::CHART_STATUS_CHANGE,
    ];
    let set: HashSet<&str> = values.iter().copied().collect();
    assert_eq!(set.len(), values.len(), "Duplicate action_types values detected: {:?}", values);
}

#[test]
fn test_entity_types_are_unique() {
    let values = [
        entity_types::STAFF_MEMBER,
        entity_types::BAND,
        entity_types::ALBUM,
        entity_types::SONG,
        entity_types::RADIO_STATION,
        entity_types::LABEL,
    ];
    let set: HashSet<&str> = values.iter().copied().collect();
    assert_eq!(set.len(), values.len(), "Duplicate entity_types values detected: {:?}", values);
}
