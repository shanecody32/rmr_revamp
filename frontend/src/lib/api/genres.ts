import type {ApiResponse} from '@/types/api/common';
import {nameFilterTypeMap} from '@/types/api/common';
import type {GenreResponse} from '@/types/api/locations';

import {api} from './config';

export const searchGenres = async (name?: string) => {
    const params: Record<string, unknown> = {
        page: 1,
        page_size: 20
    };
    if (name) {
        params.name = name;
        params.name_filter_type = nameFilterTypeMap['contains'];
    }
    const response = await api.get<ApiResponse<GenreResponse>>('/genres', { params });
    return response.data.results;
};
