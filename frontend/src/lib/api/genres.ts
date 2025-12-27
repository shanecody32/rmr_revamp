import type {ApiResponse} from '@/types/api/common';
import {nameFilterTypeMap} from '@/types/api/common';
import type {GenreResponse} from '@/types/api/locations';

import {api} from './config';

export const searchGenres = async (name: string) => {
    const response = await api.get<ApiResponse<GenreResponse>>('/genres', {
        params: {
            name,
            name_filter_type: nameFilterTypeMap['contains'],
            page: 1,
            page_size: 10
        }
    });
    return response.data.results;
};
