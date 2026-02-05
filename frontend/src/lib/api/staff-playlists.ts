'use client';

import type {
    PlaylistFilterParams,
    ArchiveFilterParams,
    CreatePlaylistEntryRequest,
    BulkUpdateSpinsRequest,
    ImportFromArchiveRequest,
    AddSpinsRequest,
    PaginatedPlaylistResponse,
    PaginatedArchiveResponse,
    PlaylistEntry,
    ImportResult,
    ArchiveWeek,
    DuplicateCheckResult,
    DuplicateWarning,
} from '@/types/api/staff-playlists';

import { api } from './config';

// =============================================================================
// Playlist CRUD Operations
// =============================================================================

export const fetchPlaylistEntries = async (
    params: PlaylistFilterParams
): Promise<PaginatedPlaylistResponse> => {
    const response = await api.get<PaginatedPlaylistResponse>('/staff_playlists', { params });
    return response.data;
};

export const createPlaylistEntry = async (
    data: CreatePlaylistEntryRequest
): Promise<PlaylistEntry> => {
    const response = await api.post<PlaylistEntry>('/staff_playlists', data);
    return response.data;
};

export const updateSpins = async (
    id: number,
    spins: number | null
): Promise<PlaylistEntry> => {
    const response = await api.put<PlaylistEntry>(`/staff_playlists/${id}/spins`, { spins });
    return response.data;
};

export const bulkUpdateSpins = async (
    data: BulkUpdateSpinsRequest
): Promise<{ updated: number }> => {
    const response = await api.post<{ updated: number }>('/staff_playlists/bulk-update-spins', data);
    return response.data;
};

export const deletePlaylistEntry = async (id: number): Promise<{ deleted: number }> => {
    const response = await api.delete<{ deleted: number }>(`/staff_playlists/${id}`);
    return response.data;
};

export const deleteAllPlaylistEntries = async (
    staffMemberId: number
): Promise<{ deleted: number }> => {
    const response = await api.delete<{ deleted: number }>(`/staff_playlists/all/${staffMemberId}`);
    return response.data;
};

// =============================================================================
// Duplicate Detection
// =============================================================================

export const checkDuplicateEntry = async (
    staffMemberId: number,
    bandId: number,
    songId: number,
    albumId?: number
): Promise<DuplicateCheckResult> => {
    const params: Record<string, number> = {
        staff_member_id: staffMemberId,
        band_id: bandId,
        song_id: songId,
    };
    if (albumId !== undefined) {
        params.album_id = albumId;
    }
    const response = await api.get<DuplicateCheckResult>('/staff_playlists/check-duplicate', { params });
    return response.data;
};

export const fetchDuplicateWarnings = async (
    bandId?: number,
    songId?: number,
    albumId?: number
): Promise<DuplicateWarning[]> => {
    const params: Record<string, number> = {};
    if (bandId !== undefined) params.band_id = bandId;
    if (songId !== undefined) params.song_id = songId;
    if (albumId !== undefined) params.album_id = albumId;
    const response = await api.get<DuplicateWarning[]>('/staff_playlists/duplicate-warnings', { params });
    return response.data;
};

// =============================================================================
// Spins Management
// =============================================================================

export const addSpinsToExisting = async (
    id: number,
    additionalSpins: number
): Promise<PlaylistEntry> => {
    const data: AddSpinsRequest = { additional_spins: additionalSpins };
    const response = await api.post<PlaylistEntry>(`/staff_playlists/${id}/add-spins`, data);
    return response.data;
};

// =============================================================================
// Archive Operations
// =============================================================================

export const importFromArchive = async (
    data: ImportFromArchiveRequest
): Promise<ImportResult> => {
    const response = await api.post<ImportResult>('/staff_playlists/import-from-archive', data);
    return response.data;
};

export const fetchArchiveWeeks = async (
    staffMemberId: number
): Promise<ArchiveWeek[]> => {
    const response = await api.get<ArchiveWeek[]>(`/staff_playlists/archive-weeks/${staffMemberId}`);
    return response.data;
};

export const fetchArchiveEntries = async (
    params: ArchiveFilterParams
): Promise<PaginatedArchiveResponse> => {
    const response = await api.get<PaginatedArchiveResponse>('/staff_playlists/archives', { params });
    return response.data;
};

// =============================================================================
// Playlist Lock/Unlock
// =============================================================================

export const finalisePlaylist = async (
    staffMemberId: number
): Promise<{ success: boolean }> => {
    const response = await api.post<{ success: boolean }>(`/staff_playlists/finalise/${staffMemberId}`);
    return response.data;
};

export const unlockPlaylist = async (
    staffMemberId: number
): Promise<{ success: boolean }> => {
    const response = await api.post<{ success: boolean }>(`/staff_playlists/unlock/${staffMemberId}`);
    return response.data;
};
