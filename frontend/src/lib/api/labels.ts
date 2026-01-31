import type {
    LabelResponse,
    CreateLabelRequest,
    UpdateLabelRequest,
    MergeLabelsRequest,
    LabelMergeResult,
} from '@/types/api/labels';
import type {ApiParams, NameFilterType, PaginationResponse} from '@/types/api/common';
import {nameFilterTypeMap} from '@/types/api/common';

import {api} from './config';

// =============================================================================
// CRUD Operations
// =============================================================================

interface FetchLabelsParams extends ApiParams {
    [key: string]: unknown;
}

export const fetchLabels = async (params: FetchLabelsParams): Promise<{
    data: LabelResponse[];
    pagination: PaginationResponse;
}> => {
    const queryParams: Record<string, string | number | boolean> = {
        page: params.page ?? 1,
        page_size: params.page_size ?? 10,
    };

    if (params.name) {
        queryParams.name = params.name;
        const filterType = (params.name_filter_type ?? 'contains') as NameFilterType;
        queryParams.name_filter_type = nameFilterTypeMap[filterType] ?? filterType;
    }

    if (params.sort_field) {
        queryParams.sort_field = params.sort_field;
        queryParams.sort_ascending = params.sort_ascending !== false;
    }

    const response = await api.get<{
        results: LabelResponse[];
        pagination: PaginationResponse;
    }>('/labels', {params: queryParams});

    return {
        data: response.data.results,
        pagination: response.data.pagination,
    };
};

export const fetchLabelById = async (id: number): Promise<LabelResponse> => {
    const response = await api.get<LabelResponse>(`/labels/${id}`);
    return response.data;
};

export const createLabel = async (data: CreateLabelRequest): Promise<LabelResponse> => {
    const response = await api.post<LabelResponse>('/labels', data);
    return response.data;
};

export const updateLabel = async (id: number, data: UpdateLabelRequest): Promise<LabelResponse> => {
    const response = await api.put<LabelResponse>(`/labels/${id}`, data);
    return response.data;
};

// =============================================================================
// Similarity & Merge Operations
// =============================================================================

export interface SimilarLabel {
    id: number;
    name: string;
    similarity_score: number;
}

export const fetchSimilarLabels = async (params: {
    search_term: string;
    existing_id?: number;
    jw_weight?: number;
    dice_weight?: number;
    min_similarity?: number;
    limit?: number;
    restrict_to_parent?: boolean;
}): Promise<SimilarLabel[]> => {
    const response = await api.get<SimilarLabel[]>('/labels/similar', {params});
    return response.data;
};

export const mergeLabels = async (data: MergeLabelsRequest): Promise<LabelMergeResult> => {
    const response = await api.post<LabelMergeResult>('/labels/merge', data, {
        timeout: 5 * 60 * 1000,
    });
    return response.data;
};
