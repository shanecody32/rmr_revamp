import type {ApiResponse} from '@/types/api/common';
import {nameFilterTypeMap} from '@/types/api/common';
import type {SubGenreResponse} from '@/types/api/locations';

import {api} from './config';

export const searchSubGenres = async (name: string, genreId?: number) => {
    const response = await api.get<ApiResponse<SubGenreResponse>>('/sub_genres', {
        params: {
            name,
            name_filter_type: nameFilterTypeMap['contains'],
            genre_id: genreId,
            page: 1,
            page_size: 10
        }
    });
    return response.data.results;
};
