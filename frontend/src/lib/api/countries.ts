import type {ApiResponse} from '@/types/api/common';
import {nameFilterTypeMap} from '@/types/api/common';
import type {CountryResponse} from '@/types/api/locations';

import {api} from './config';

export const searchCountries = async (name?: string) => {
    const params: Record<string, unknown> = {
        page: 1,
        page_size: 20
    };
    if (name) {
        params.name = name;
        params.name_filter_type = nameFilterTypeMap['contains'];
    }
    const response = await api.get<ApiResponse<CountryResponse>>('/countries', { params });
    return response.data.results;
};

export const fetchCountryById = async (id: number): Promise<CountryResponse | null> => {
    try {
        const response = await api.get<CountryResponse>(`/countries/${id}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching country ${id}:`, error);
        return null;
    }
};
