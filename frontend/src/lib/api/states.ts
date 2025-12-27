import type {ApiResponse} from '@/types/api/common';
import {nameFilterTypeMap} from '@/types/api/common';
import type {StateResponse} from '@/types/api/locations';

import {api} from './config';

export const searchStates = async (name: string, countryId?: number) => {
    const response = await api.get<ApiResponse<StateResponse>>('/states', {
        params: {
            name,
            name_filter_type: nameFilterTypeMap['contains'],
            country_id: countryId,
            page: 1,
            page_size: 10
        }
    });
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
