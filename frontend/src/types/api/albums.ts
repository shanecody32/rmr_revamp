import type {BandResponse} from './bands';
import type {BaseEntity} from './common';
import type {GenreResponse, SubGenreResponse} from './genres';
import type {SongWithTrackInfoResponse} from './songs';

export interface AlbumResponse extends BaseEntity {
    band_id?: number;
    release_date: string | null;
    about: string;
    thanks: string;
    producer: string;
    engineer: string;
    studio: string;
    master: string;
    itunes_url: string;
    cdbaby_url: string;
    amazon_url: string;
    img: string;
    itunes_id: number;
    rovi_id: string;
    sub_genre_for_charting: number;
    genre_admin_set: boolean;
    compilation: boolean;
    soundtrack: boolean;
    approved_by: number | null;
    verified_by: number | null;
    label_id: number;
}

export interface AlbumImageResponse {
    id: number;
    album_id: number;
    path: string | null;
    filename: string | null;
    thumbname: string | null;
    created_at: string;
    updated_at: string;
}

export interface AlbumWithRelationsResponse extends AlbumResponse {
    bands: BandResponse[];
    images: AlbumImageResponse[];
    sub_genres: SubGenreResponse[];
    genres: GenreResponse[];
    songs: SongWithTrackInfoResponse[];
}

// =============================================================================
// Merge Types
// =============================================================================

export interface MergeAlbumsRequest {
    from_ids: number[];
    into_id: number;
    merged_data: Record<string, unknown>;
}

export interface AlbumMergeStats {
    images_moved: number;
    images_deduped: number;
    band_associations_moved: number;
    band_associations_deduped: number;
    song_associations_moved: number;
    song_associations_deduped: number;
    sub_genres_added: number;
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
    albums_deleted: number;
}

export interface AlbumMergeResult {
    merged_album: AlbumResponse;
    stats: AlbumMergeStats;
}
