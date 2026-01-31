import type {AlbumResponse} from '@/types/api/albums';
import {ApiParams, ApiResponse, nameFilterTypeMap, PaginationResponse} from '@/types/api/common';

import {api} from './config';

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
