import type {ApiResponse} from '@/types/api/common';
import {nameFilterTypeMap} from '@/types/api/common';
import type {StateResponse} from '@/types/api/locations';

import {api} from './config';

export const searchStates = async (name?: string, countryId?: number) => {
    const params: Record<string, unknown> = {
        page: 1,
        page_size: 20
    };
    if (name) {
        params.name = name;
        params.name_filter_type = nameFilterTypeMap['contains'];
    }
    if (countryId) {
        params.country_id = countryId;
    }
    const response = await api.get<ApiResponse<StateResponse>>('/states', { params });
    return response.data.results;
};

export const fetchStateById = async (id: number): Promise<StateResponse | null> => {
    try {
        const response = await api.get<StateResponse>(`/states/${id}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching state ${id}:`, error);
        return null;
    }
};
