import {ApiParams, ApiResponse, PaginationResponse} from '@/types/api/common';
import {nameFilterTypeMap} from '@/types/api/common';
import type {SongResponse} from '@/types/api/songs';

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
