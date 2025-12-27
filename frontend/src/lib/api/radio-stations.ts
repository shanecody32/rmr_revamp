import {PaginationResponse, RadioStationResponse} from '@/types/api';
import type {ApiParams, ApiResponse} from '@/types/api/common';
import {nameFilterTypeMap} from '@/types/api/common';

import {api} from './config';

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
