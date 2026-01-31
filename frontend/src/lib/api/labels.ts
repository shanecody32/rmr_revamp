import type {LabelResponse, MergeLabelsRequest, LabelMergeResult} from '@/types/api/labels';

import {api} from './config';

export const mergeLabels = async (data: MergeLabelsRequest): Promise<LabelMergeResult> => {
    const response = await api.post<LabelMergeResult>('/labels/merge', data, {
        timeout: 5 * 60 * 1000,
    });
    return response.data;
};

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
