// Common types used across multiple API endpoints
export type NameFilterType = 'contains' | 'startswith' | 'endswith' | 'exact';

// Map our internal filter types to the API's expected values
export const nameFilterTypeMap: Record<NameFilterType, string> = {
    'contains': 'contains',
    'startswith': 'starts_with',
    'endswith': 'ends_with',
    'exact': 'exact_match'
};

export interface ApiParams {
    page?: number;
    page_size?: number;
    sort_field?: string;
    sort_ascending?: boolean;
    name?: string;
    name_filter_type?: NameFilterType;
    filters?: Record<string, boolean | undefined>;
}

// Base interface for common fields across entities
export interface BaseEntity {
    id: number;
    name: string;
    slug: string;
    verified: boolean;
    verified_by_id: number | null;
    approved: boolean;
    approved_by_id: number | null;
    created_at: string;
    updated_at: string;
}

export interface PaginationResponse {
    page: number;
    page_size: number;
    total_pages: number;
    total_count?: number;
    total_items?: number;
}

export interface ApiResponse<T> {
    results: T[];
    pagination: PaginationResponse;
}

// ========== Status System Types ==========

export type DataStatus = 'new' | 'validated' | 'needs_review' | 'duplicate_detected';
export type ChartStatus = 'pending' | 'approved' | 'denied' | 'suspended';

export type DataStatusReason =
    | 'manual'
    | 'album_added'
    | 'song_added'
    | 'merge'
    | 'transfer'
    | 'duplicate_scan';

export type ChartDenialReason =
    | 'duplicate'
    | 'terms_violation'
    | 'editorial'
    | 'spam'
    | 'other';

export interface EntityStatus {
    data_status: DataStatus;
    data_status_reason: string | null;
    data_status_note: string | null;
    data_status_at: string | null;
    data_status_by: number | null;
    chart_status: ChartStatus;
    chart_denial_reason: string | null;
    chart_status_note: string | null;
    chart_status_at: string | null;
    chart_status_by: number | null;
}

// Extended base entity with new status fields
export interface BaseEntityWithStatus extends Omit<BaseEntity, 'verified' | 'verified_by_id' | 'approved' | 'approved_by_id'>, EntityStatus {
    // Legacy compatibility fields (computed from new status)
    verified: boolean;
    approved: boolean;
}

// ========== Band Types ==========

export type BandType = 'artist' | 'group' | 'collaboration';

// ========== Album Types ==========

export type AlbumFormat = 'lp' | 'ep' | 'single';

// ========== Song Types ==========

export type SongVersionType = 'original' | 'remix' | 'live' | 'acoustic' | 'cover' | 'radio_edit' | 'extended';
export type SongArtistRole = 'primary' | 'featured' | 'remix_by';

export interface SongArtist {
    id: number;
    song_id: number;
    band_id: number;
    band_name?: string;
    role: SongArtistRole;
}

// ========== Transfer Types ==========

export interface TransferAffectedCounts {
    staff_playlists: number;
    staff_playlist_archives: number;
    radio_playlists: number;
    radio_playlist_archives: number;
    radio_raw_datas: number;
    song_aliases: number;
    album_aliases: number;
    albums_songs: number;
    albums_bands: number;
    songs: number;
}

export interface TransferPreview {
    affected: TransferAffectedCounts;
    stats_recalc_album_ids: number[];
    stats_recalc_song_ids: number[];
}

export interface TransferResult {
    success: boolean;
    affected: TransferAffectedCounts;
    message: string;
}

// ========== Status Update Types ==========

export interface DataStatusUpdate {
    status: DataStatus;
    reason?: string;
    note?: string;
}

export interface ChartStatusUpdate {
    status: ChartStatus;
    denial_reason?: string;
    note?: string;
}

export interface StatusUpdateResult {
    success: boolean;
    message: string;
    warning?: string;
}

export interface StatusHistoryEntry {
    timestamp: string;
    action_type: string;
    old_status?: string;
    new_status: string;
    reason?: string;
    note?: string;
    user_id?: number;
}