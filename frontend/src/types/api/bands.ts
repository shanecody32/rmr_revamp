import type {AlbumWithRelationsResponse} from './albums';
import type {BaseEntity} from './common';
import type {GenreResponse, SubGenreResponse} from './locations';

// =============================================================================
// View Layer Types (optimized for different use cases)
// =============================================================================

/**
 * Lightweight band data for list/table displays.
 * Fetches only ~10 columns instead of 40+.
 */
export interface BandListView {
    id: number;
    name: string;
    slug: string | null;
    verified: boolean;
    approved: boolean;
    country_id: number | null;
    state_id: number | null;
    city_id: number | null;
    created_at: string;
    updated_at: string;
}

/**
 * Enriched band list view with resolved location names and genres.
 * Use this for list/table displays.
 */
export interface BandListViewEnriched extends BandListView {
    country_name: string | null;
    state_name: string | null;
    city_name: string | null;
    genre_names: string[];
    sub_genre_names: string[];
    image_url: string | null;
}

/**
 * Band summary for embedding in other responses (e.g., album detail).
 */
export interface BandSummary {
    id: number;
    name: string;
    slug: string | null;
    country_name: string | null;
    image_url: string | null;
}

/**
 * Album summary for embedding in band detail responses.
 */
export interface AlbumSummary {
    id: number;
    name: string | null;
    slug: string | null;
    release_date: string | null;
    /** Raw img field from albums table (external link from old system). Prefer image_url. */
    img: string | null;
    /** Resolved image URL: album_images table first, then album.img fallback. */
    image_url: string | null;
    song_count: number;
    genre_name: string | null;
}

/**
 * Full band detail view with all relations.
 * Albums are optional - only loaded when include_albums=true.
 */
export interface BandDetailView extends BandResponse {
    albums?: AlbumWithRelationsResponse[];
}

// =============================================================================
// API Response Wrappers
// =============================================================================

/**
 * Standardized success response wrapper.
 * Note: Named ApiSuccessResponse to avoid conflict with ApiResponse in common.ts
 */
export interface ApiSuccessResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}

/**
 * Standardized error response.
 */
export interface ApiError {
    success: boolean;
    error: {
        code: string;
        message: string;
        field?: string;
    };
}

// =============================================================================
// Original Types (backward compatible)
// =============================================================================

export interface BandImageResponse {
    id: number;
    band_id: number;
    path: string | null;
    filename: string | null;
    thumbname: string | null;
    order: number;
    created_at: string;
    updated_at: string;
}

export interface BandResponse extends BaseEntity {
    website: string | null;
    email: string | null;
    twitter: string | null;
    facebook_url: string | null;
    lastfm_url: string | null;
    myspace_url: string | null;
    google_url: string | null;
    wikipedia_url: string | null;
    cdbaby_url: string | null;
    youtube_url: string | null;
    reverb_url: string | null;
    itunes_url: string | null;
    instagram_url: string | null;
    pinterest_url: string | null;
    itunes_id: number | null;
    amg_id: number | null;
    rovi_id: string | null;
    echo_id: string | null;
    seven_digital_id: number | null;
    discogs_id: number | null;
    spotify_id: string | null;
    rdio_id: number | null;
    rss_feed: string | null;
    bio: string | null;
    hot_download: boolean;
    city_id: number | null;
    state_id: number | null;
    country_id: number | null;
    reviewed_by_id: number | null;
    // Add relations
    country?: { id: number; name: string; slug: string };
    state?: { id: number; name: string; slug: string };
    city?: { id: number; name: string; slug: string };
    genres?: GenreResponse[];
    sub_genres?: SubGenreResponse[];
    images?: BandImageResponse[];
}

export interface BandWithDiscographyResponse extends BandResponse {
    albums?: AlbumWithRelationsResponse[];
}

// Export alias for common usage
export type BandImage = BandImageResponse;

/**
 * Response wrapper for discography summary endpoint.
 */
export interface BandDiscographySummaryResponse {
    albums: AlbumSummary[];
}

// =============================================================================
// Merge Types
// =============================================================================

/**
 * Statistics about what was moved during a merge operation.
 */
export interface MergeStats {
    images_moved: number;
    links_moved: number;
    aliases_moved: number;
    songs_moved: number;
    albums_moved: number;
    reviews_moved: number;
    users_moved: number;
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
    song_aliases_moved: number;
    song_aliases_deduped: number;
    album_aliases_moved: number;
    album_aliases_deduped: number;
    duplicate_candidates_updated: number;
    duplicate_candidates_cleaned: number;
    bands_deleted: number;
}

/**
 * Duplicate song found during merge (same name in target band).
 */
export interface SongDuplicate {
    from_song_id: number;
    from_song_name: string;
    target_song_id: number;
    target_song_name: string;
}

/**
 * Duplicate album found during merge (same name in target band).
 */
export interface AlbumDuplicate {
    from_album_id: number;
    from_album_name: string;
    target_album_id: number;
    target_album_name: string;
}

/**
 * Result of a merge operation returned from the backend.
 */
export interface MergeResult {
    merged_band: BandResponse;
    duplicate_songs: SongDuplicate[];
    duplicate_albums: AlbumDuplicate[];
    stats: MergeStats;
}
