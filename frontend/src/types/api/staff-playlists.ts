import type { PaginationResponse } from './common';

// =============================================================================
// Playlist Entry Types
// =============================================================================

export interface PlaylistEntry {
    id: number;
    staff_member_id: number | null;
    band_id: number | null;
    band_name: string | null;
    album_id: number | null;
    album_name: string | null;
    song_id: number | null;
    song_name: string | null;
    label_id: number | null;
    label_name: string | null;
    sub_genre_id: number | null;
    sub_genre_name: string | null;
    spins: number | null;
    invalid: number;
    created: string | null;
    modified: string | null;
}

export interface ArchiveEntry extends PlaylistEntry {
    week_ending: string | null;
}

// =============================================================================
// Request Types
// =============================================================================

export interface CreatePlaylistEntryRequest {
    staff_member_id: number;
    band_id: number;
    song_id: number;
    album_id?: number;
    spins?: number;
}

export interface UpdateSpinsRequest {
    spins: number | null;
}

export interface BulkUpdateSpinsEntry {
    id: number;
    spins: number | null;
}

export interface BulkUpdateSpinsRequest {
    updates: BulkUpdateSpinsEntry[];
}

export interface ImportFromArchiveRequest {
    staff_member_id: number;
    week_ending?: string;
    with_spins: boolean;
}

export interface AddSpinsRequest {
    additional_spins: number;
}

// =============================================================================
// Response Types
// =============================================================================

export interface PaginatedPlaylistResponse {
    results: PlaylistEntry[];
    pagination: PaginationResponse;
}

export interface PaginatedArchiveResponse {
    results: ArchiveEntry[];
    pagination: PaginationResponse;
}

export interface ImportResult {
    imported_count: number;
    skipped_count: number;
}

export interface ArchiveWeek {
    week_ending: string;
}

export interface DuplicateCheckResult {
    duplicate: boolean;
    entry?: PlaylistEntry;
}

export interface DuplicateWarning {
    entity_type: string;
    entity_id: number;
    pending_count: number;
}

// =============================================================================
// Filter Types
// =============================================================================

export interface PlaylistFilterParams {
    staff_member_id: number;
    page?: number;
    page_size?: number;
    band_name?: string;
    song_name?: string;
    sort_field?: string;
    sort_ascending?: boolean;
}

export interface ArchiveFilterParams {
    staff_member_id: number;
    week_ending?: string;
    page?: number;
    page_size?: number;
    band_name?: string;
    song_name?: string;
    sort_field?: string;
    sort_ascending?: boolean;
}
