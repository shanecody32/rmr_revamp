'use client'

import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';

import { fetchBands, createBand, updateBand, fetchBandById, mergeBands, fetchSimilarBands } from '@/lib/api/bands';
import { handleApiError } from '@/lib/errors';
import type { BandResponse, BandWithDiscographyResponse } from '@/types/api/bands';
import type { ApiParams } from '@/types/api/common';

interface UseBandsParams extends ApiParams {
    country_id?: number;
    state_id?: number;
    city_id?: number;
    genre_id?: number;
    sub_genre_id?: number;
    filters?: Record<string, boolean>;
}

export function useBands(params: UseBandsParams) {
    const key = ['bands', JSON.stringify(params)];
    
    const { data, error, isLoading, mutate } = useSWR(
        key,
        () => fetchBands(params),
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            dedupingInterval: 2000,
            errorRetryCount: 3,
            errorRetryInterval: 1000,
        }
    );

    return {
        bands: data?.data || [],
        total: data?.pagination.total_count || 0,
        isLoading,
        error: error ? handleApiError(error) : null,
        refresh: () => mutate(),
        mutate,
    };
}

export function useBand(id: number | null) {
    const { data, error, isLoading, mutate } = useSWR(
        id ? ['band', id] : null,
        () => fetchBandById(id!),
        {
            revalidateOnFocus: false,
            dedupingInterval: 5000,
        }
    );

    return {
        band: data as BandWithDiscographyResponse | undefined,
        isLoading,
        error: error ? handleApiError(error) : null,
        refresh: () => mutate(),
        mutate,
    };
}

export function useCreateBand() {
    const { trigger, isMutating, error } = useSWRMutation(
        'bands/create',
        async (_, { arg }: { arg: Partial<BandResponse> }) => {
            return await createBand(arg);
        }
    );

    return {
        createBand: trigger,
        isCreating: isMutating,
        error: error ? handleApiError(error) : null,
    };
}

export function useUpdateBand() {
    const { trigger, isMutating, error } = useSWRMutation(
        'bands/update',
        async (_, { arg }: { arg: { id: number; data: Partial<BandResponse> } }) => {
            return await updateBand(arg.id, arg.data);
        }
    );

    return {
        updateBand: trigger,
        isUpdating: isMutating,
        error: error ? handleApiError(error) : null,
    };
}

interface SimilarityParams {
    search_term: string;
    existing_id?: number;
    jw_weight?: number;
    dice_weight?: number;
    min_similarity?: number;
}

export function useSimilarBands(params: SimilarityParams | null) {
    const { data, error, isLoading } = useSWR(
        params ? ['bands/similar', params] : null,
        () => fetchSimilarBands(params!),
        {
            revalidateOnFocus: false,
            dedupingInterval: 5000,
        }
    );

    return {
        similarBands: data || [],
        isLoading,
        error: error ? handleApiError(error) : null,
    };
}

interface MergeBandsRequest {
    from_ids: number[];
    into_id: number;
    merged_data: Partial<BandResponse>;
}

export function useMergeBands() {
    const { trigger, isMutating, error } = useSWRMutation(
        'bands/merge',
        async (_, { arg }: { arg: MergeBandsRequest }) => {
            return await mergeBands(arg);
        }
    );

    return {
        mergeBands: trigger,
        isMerging: isMutating,
        error: error ? handleApiError(error) : null,
    };
}