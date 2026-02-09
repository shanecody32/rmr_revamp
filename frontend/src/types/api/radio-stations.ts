import type {BaseEntity} from './common';

export interface RadioStationResponse extends BaseEntity {
    station_type: 'terrestrial' | 'internet';
    info: string;
    active: boolean;
    automatic: boolean;
    influence: number;
    no_show: boolean;
    imported_from_file: boolean;
    approved_by: number | null;
    verified_by: number | null;
}

// =============================================================================
// Merge Types
// =============================================================================

export interface MergeRadioStationsRequest {
    from_ids: number[];
    into_id: number;
    merged_data: Record<string, unknown>;
}

export interface RadioStationMergeStats {
    addresses_moved: number;
    affiliates_moved: number;
    emails_moved: number;
    emails_deduped: number;
    images_moved: number;
    images_deduped: number;
    links_moved: number;
    links_deduped: number;
    phone_numbers_moved: number;
    phone_numbers_deduped: number;
    internet_details_handled: number;
    satellite_details_handled: number;
    syndicated_details_handled: number;
    terrestrial_details_handled: number;
    staff_members_reassigned: number;
    sub_genres_added: number;
    users_moved: number;
    users_deduped: number;
    radio_playlists_moved: number;
    radio_playlists_aggregated: number;
    radio_playlist_archives_moved: number;
    radio_playlist_archives_aggregated: number;
    raw_data_updated: number;
    song_aliases_reassigned: number;
    album_aliases_reassigned: number;
    station_aliases_moved: number;
    station_aliases_deduped: number;
    duplicate_candidates_updated: number;
    duplicate_candidates_cleaned: number;
    radio_stations_deleted: number;
}

export interface RadioStationMergeResult {
    merged_station: RadioStationResponse;
    stats: RadioStationMergeStats;
}

// =============================================================================
// Merge Preview Types
// =============================================================================

export interface RadioStationRelatedCounts {
    addresses: number;
    affiliates: number;
    emails: number;
    images: number;
    links: number;
    phone_numbers: number;
    internet_details: number;
    satellite_details: number;
    syndicated_details: number;
    terrestrial_details: number;
    staff_members: number;
    sub_genres: number;
    users: number;
    playlists: number;
    playlist_archives: number;
    raw_data: number;
    song_aliases: number;
    album_aliases: number;
    station_aliases: number;
    duplicate_candidates: number;
}

export interface RadioStationMergePreviewItem {
    station_id: number;
    station_name: string;
    counts: RadioStationRelatedCounts;
}

export interface RadioStationMergePreviewResponse {
    stations: RadioStationMergePreviewItem[];
    totals: RadioStationRelatedCounts;
}
