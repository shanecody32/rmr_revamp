import type {BaseEntity} from './common';

export interface SongResponse extends BaseEntity {
    lyrics?: string;
    lyrics_writer?: string;
    music_writer?: string;
    license?: string;
    publisher?: string;
    length?: number;
    release_date?: string | null;
    itunes_url?: string;
    itunes_img?: string;
    itunes_preview?: string;
    itunes_id?: number;
    rovi_id?: string;
    echo_id?: string;
    verified_by?: number | null;
    approved_by?: number | null;
    band_id: number;
    sub_genre_id: number;
}

export interface SongWithTrackInfoResponse {
    id: number;
    album_id: number;
    song_id: number;
    track_number: number;
    disc_number?: number;
    created_at?: string;
    updated_at?: string;
    created?: string;
    modified?: string;
    song: SongResponse;
}

// =============================================================================
// Merge Types
// =============================================================================

export interface MergeSongsRequest {
    from_ids: number[];
    into_id: number;
    merged_data: Record<string, unknown>;
}

export interface SongMergeStats {
    performers_moved: number;
    performers_deduped: number;
    album_associations_moved: number;
    album_associations_deduped: number;
    radio_playlists_moved: number;
    radio_playlists_aggregated: number;
    radio_playlist_archives_moved: number;
    radio_playlist_archives_aggregated: number;
    staff_playlists_moved: number;
    staff_playlists_aggregated: number;
    staff_playlist_archives_moved: number;
    staff_playlist_archives_aggregated: number;
    raw_data_updated: number;
    rankings_moved: number;
    total_stats_moved: number;
    weekly_stats_moved: number;
    aliases_moved: number;
    aliases_deduped: number;
    duplicate_candidates_updated: number;
    duplicate_candidates_cleaned: number;
    songs_deleted: number;
}

export interface SongMergeResult {
    merged_song: SongResponse;
    stats: SongMergeStats;
}
