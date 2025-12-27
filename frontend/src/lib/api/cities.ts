import type {ApiResponse} from '@/types/api/common';
import {nameFilterTypeMap} from '@/types/api/common';
import type {CityResponse} from '@/types/api/locations';

import {api} from './config';

export const searchCities = async (name: string, params?: { stateId?: number; countryId?: number }) => {
    const response = await api.get<ApiResponse<CityResponse>>('/cities', {
        params: {
            name,
            name_filter_type: nameFilterTypeMap['contains'],
            state_id: params?.stateId,
            country_id: params?.countryId,
            page: 1,
            page_size: 10
        }
    });
    return response.data.results;
};
