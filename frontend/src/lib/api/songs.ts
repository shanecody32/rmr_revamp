import {ApiParams, ApiResponse, PaginationResponse} from '@/types/api/common';
import {nameFilterTypeMap} from '@/types/api/common';
import type {SongResponse, MergeSongsRequest, SongMergeResult} from '@/types/api/songs';

import {api} from './config';

export const fetchSongs = async (params: ApiParams): Promise<{
    data: SongResponse[];
    pagination: PaginationResponse
}> => {
    // Transform filter parameters to match API expectations
    const apiParams = {
        ...params,
        name_filter_type: params.name_filter_type ? nameFilterTypeMap[params.name_filter_type] : 'contains',
        verified: undefined as boolean | undefined,
        approved: undefined as boolean | undefined
    };

    if (params.filters) {
        if (params.filters.verified_approved) {
            apiParams.verified = true;
            apiParams.approved = true;
        } else if (params.filters.verified_pending) {
            apiParams.verified = true;
            apiParams.approved = false;
        } else if (params.filters.approved_only) {
            apiParams.verified = false;
            apiParams.approved = true;
        } else if (params.filters.pending_all) {
            apiParams.verified = false;
            apiParams.approved = false;
        }
    }

    // Remove the filters property as we've transformed it
    delete apiParams.filters;

    const response = await api.get<ApiResponse<SongResponse>>('/songs', {
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

export const createSong = async (data: Partial<SongResponse>): Promise<SongResponse> => {
    const response = await api.post<SongResponse>('/songs', data);
    return response.data;
};

export const mergeSongs = async (data: MergeSongsRequest): Promise<SongMergeResult> => {
    const response = await api.post<SongMergeResult>('/songs/merge', data, {
        timeout: 5 * 60 * 1000,
    });
    return response.data;
};

export interface SimilarSong {
    id: number;
    name: string;
    similarity_score: number;
}

export const fetchSongById = async (id: number): Promise<SongResponse> => {
    const response = await api.get<SongResponse>(`/songs/${id}`);
    return response.data;
};

export const updateSong = async (id: number, data: Partial<SongResponse>): Promise<SongResponse> => {
    const response = await api.put<SongResponse>(`/songs/${id}`, data);
    return response.data;
};

export const deleteSong = async (id: number): Promise<void> => {
    await api.delete(`/songs/${id}`);
};

export const fetchSimilarSongs = async (params: {
    search_term: string;
    existing_id?: number;
    jw_weight?: number;
    dice_weight?: number;
    min_similarity?: number;
    limit?: number;
    band_id?: number;
    restrict_to_parent?: boolean;
}): Promise<SimilarSong[]> => {
    const response = await api.get<SimilarSong[]>('/songs/similar', {params});
    return response.data;
};
