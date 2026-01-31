import type {ApiResponse} from '@/types/api/common';
import {nameFilterTypeMap} from '@/types/api/common';
import type {SubGenreResponse} from '@/types/api/locations';

import {api} from './config';

export const searchSubGenres = async (name?: string, genreId?: number) => {
    const params: Record<string, unknown> = {
        page: 1,
        page_size: 20
    };
    if (name) {
        params.name = name;
        params.name_filter_type = nameFilterTypeMap['contains'];
    }
    if (genreId) {
        params.genre_id = genreId;
    }
    const response = await api.get<ApiResponse<SubGenreResponse>>('/sub_genres', { params });
    return response.data.results;
};
