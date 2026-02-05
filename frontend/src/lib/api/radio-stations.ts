import {PaginationResponse, RadioStationResponse} from '@/types/api';
import type {MergeRadioStationsRequest, RadioStationMergeResult} from '@/types/api/radio-stations';
import type {ApiParams, ApiResponse} from '@/types/api/common';
import {nameFilterTypeMap} from '@/types/api/common';

import {api} from './config';

export const fetchRadioStationById = async (id: number): Promise<RadioStationResponse> => {
    const response = await api.get<RadioStationResponse>(`/radio_stations/${id}`);
    return response.data;
};

export const fetchRadioStations = async (params: ApiParams): Promise<{
    data: RadioStationResponse[];
    pagination: PaginationResponse
}> => {
        // Update the name_filter_type to use the correct API format
    const apiParams = {
        ...params,
        name_filter_type: params.name_filter_type ? nameFilterTypeMap[params.name_filter_type] : 'contains'
    };

    const response = await api.get<ApiResponse<RadioStationResponse>>('/radio_stations', {params: apiParams});
    return {
        data: response.data.results,
        pagination: {
            page: response.data?.pagination?.page || 1,
            page_size: response.data?.pagination?.page_size || 10,
            total_pages: response.data?.pagination?.total_pages || 1,
            total_count: response.data?.pagination?.total_items || 0
        },
    };
};

export const createRadioStation = async (data: Partial<RadioStationResponse>): Promise<RadioStationResponse> => {
    const response = await api.post<RadioStationResponse>('/radio_stations', data);
    return response.data;
};

export const mergeRadioStations = async (data: MergeRadioStationsRequest): Promise<RadioStationMergeResult> => {
    const response = await api.post<RadioStationMergeResult>('/radio_stations/merge', data, {
        timeout: 5 * 60 * 1000,
    });
    return response.data;
};

export interface SimilarRadioStation {
    id: number;
    name: string;
    similarity_score: number;
}

export const fetchSimilarRadioStations = async (params: {
    search_term: string;
    existing_id?: number;
    jw_weight?: number;
    dice_weight?: number;
    min_similarity?: number;
    limit?: number;
    restrict_to_parent?: boolean;
}): Promise<SimilarRadioStation[]> => {
    const response = await api.get<SimilarRadioStation[]>('/radio_stations/similar', {params});
    return response.data;
};
