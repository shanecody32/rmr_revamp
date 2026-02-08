//! Tests for transfer service types (struct defaults and construction).

use backend::services::transfer_service::{TransferAffectedCounts, TransferResult, TransferPreview};

#[test]
fn test_transfer_affected_counts_default_all_zero() {
    let counts = TransferAffectedCounts::default();
    assert_eq!(counts.staff_playlists, 0);
    assert_eq!(counts.staff_playlist_archives, 0);
    assert_eq!(counts.radio_playlists, 0);
    assert_eq!(counts.radio_playlist_archives, 0);
    assert_eq!(counts.radio_raw_datas, 0);
    assert_eq!(counts.song_aliases, 0);
    assert_eq!(counts.album_aliases, 0);
    assert_eq!(counts.albums_songs, 0);
    assert_eq!(counts.albums_bands, 0);
    assert_eq!(counts.songs, 0);
}

#[test]
fn test_transfer_result_construction() {
    let result = TransferResult {
        success: true,
        affected: TransferAffectedCounts::default(),
        message: "Transferred successfully".to_string(),
    };
    assert!(result.success);
    assert_eq!(result.message, "Transferred successfully");
    assert_eq!(result.affected.staff_playlists, 0);
}

#[test]
fn test_transfer_preview_construction() {
    let preview = TransferPreview {
        affected: TransferAffectedCounts {
            staff_playlists: 5,
            radio_playlists: 3,
            ..Default::default()
        },
        stats_recalc_album_ids: vec![1, 2],
        stats_recalc_song_ids: vec![10, 20, 30],
    };
    assert_eq!(preview.affected.staff_playlists, 5);
    assert_eq!(preview.affected.radio_playlists, 3);
    assert_eq!(preview.stats_recalc_album_ids.len(), 2);
    assert_eq!(preview.stats_recalc_song_ids.len(), 3);
}

#[test]
fn test_transfer_affected_counts_partial_fields() {
    let counts = TransferAffectedCounts {
        songs: 42,
        albums_bands: 7,
        ..Default::default()
    };
    assert_eq!(counts.songs, 42);
    assert_eq!(counts.albums_bands, 7);
    assert_eq!(counts.staff_playlists, 0);
    assert_eq!(counts.radio_raw_datas, 0);
}
