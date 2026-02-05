import type {AlbumResponse, AlbumWithRelationsResponse, MergeAlbumsRequest, AlbumMergeResult} from '@/types/api/albums';
import {ApiParams, ApiResponse, nameFilterTypeMap, PaginationResponse} from '@/types/api/common';

import {api} from './config';

export const fetchAlbumById = async (id: number): Promise<AlbumWithRelationsResponse> => {
    const response = await api.get<AlbumWithRelationsResponse>(`/albums/${id}`);
    return response.data;
};

export const fetchAlbums = async (params: ApiParams): Promise<{
    data: AlbumResponse[];
    pagination: PaginationResponse
}> => {
    // Update the name_filter_type to use the correct API format
    const apiParams = {
        ...params,
        name_filter_type: params.name_filter_type ? nameFilterTypeMap[params.name_filter_type] : 'starts_with'
    };

    const response = await api.get<ApiResponse<AlbumResponse>>('/albums', {
        params: apiParams
    });

    return {
        data: response.data.results,
        pagination: {
            page: response.data?.pagination?.page || 1,
            page_size: response.data?.pagination?.page_size || 10,
            total_pages: response.data?.pagination?.total_pages || 1,
            total_count: response.data?.pagination?.total_items || 0
        }
    };
};

export async function createAlbum(data: Partial<AlbumResponse>): Promise<AlbumResponse> {
    const response = await api.post<AlbumResponse>('/albums', data);
    return response.data;
}

export async function updateAlbum(id: number, data: Partial<AlbumResponse>): Promise<AlbumResponse> {
    const response = await api.put<AlbumResponse>(`/albums/${id}`, data);
    return response.data;
}

export const mergeAlbums = async (data: MergeAlbumsRequest): Promise<AlbumMergeResult> => {
    const response = await api.post<AlbumMergeResult>('/albums/merge', data, {
        timeout: 5 * 60 * 1000,
    });
    return response.data;
};

export interface SimilarAlbum {
    id: number;
    name: string;
    similarity_score: number;
}

export const fetchSimilarAlbums = async (params: {
    search_term: string;
    existing_id?: number;
    jw_weight?: number;
    dice_weight?: number;
    min_similarity?: number;
    limit?: number;
    band_id?: number;
    restrict_to_parent?: boolean;
}): Promise<SimilarAlbum[]> => {
    const response = await api.get<SimilarAlbum[]>('/albums/similar', {params});
    return response.data;
};

export interface UnknownAlbumResponse {
    id: number;
    name: string | null;
    slug: string | null;
}

/**
 * Get or create an "Unknown" album for a band.
 * Used when creating playlist entries where the song's album is unknown.
 */
export const fetchUnknownAlbum = async (bandId: number): Promise<UnknownAlbumResponse> => {
    const response = await api.get<UnknownAlbumResponse>(`/bands/${bandId}/unknown-album`);
    return response.data;
};

export interface AlbumSong {
    id: number;
    name: string | null;
    slug: string | null;
    band_id: number | null;
}

/**
 * Get all songs for a specific album.
 */
export const fetchAlbumSongs = async (albumId: number): Promise<AlbumSong[]> => {
    const response = await api.get<AlbumSong[]>(`/albums/${albumId}/songs`);
    return response.data;
};
