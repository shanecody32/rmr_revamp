'use client'

import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';

import { api } from '@/lib/api/config';
import { handleApiError } from '@/lib/errors';
import type { ApiParams, ApiResponse } from '@/types/api/common';
import type { SongResponse } from '@/types/api/songs';

async function fetchSongs(params: ApiParams): Promise<{ data: SongResponse[]; total: number }> {
    const response = await api.get<ApiResponse<SongResponse>>('/songs', { params });
    
    return {
        data: response.data.results,
        total: response.data.pagination?.total_count || response.data.results.length,
    };
}

async function fetchSongById(id: number): Promise<SongResponse> {
    const response = await api.get<SongResponse>(`/songs/${id}`);
    return response.data;
}

async function createSong(data: Partial<SongResponse>): Promise<SongResponse> {
    const response = await api.post<SongResponse>('/songs', data);
    return response.data;
}

async function updateSong(id: number, data: Partial<SongResponse>): Promise<SongResponse> {
    const response = await api.put<SongResponse>(`/songs/${id}`, data);
    return response.data;
}

export function useSongs(params: ApiParams) {
    const key = ['songs', JSON.stringify(params)];
    
    const { data, error, isLoading, mutate } = useSWR(
        key,
        () => fetchSongs(params),
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            dedupingInterval: 2000,
        }
    );

    return {
        songs: data?.data || [],
        total: data?.total || 0,
        isLoading,
        error: error ? handleApiError(error) : null,
        refresh: () => mutate(),
        mutate,
    };
}

export function useSong(id: number | null) {
    const { data, error, isLoading, mutate } = useSWR(
        id ? ['song', id] : null,
        () => fetchSongById(id!),
        {
            revalidateOnFocus: false,
            dedupingInterval: 5000,
        }
    );

    return {
        song: data,
        isLoading,
        error: error ? handleApiError(error) : null,
        refresh: () => mutate(),
        mutate,
    };
}

export function useCreateSong() {
    const { trigger, isMutating, error } = useSWRMutation(
        'songs/create',
        async (_, { arg }: { arg: Partial<SongResponse> }) => {
            return await createSong(arg);
        }
    );

    return {
        createSong: trigger,
        isCreating: isMutating,
        error: error ? handleApiError(error) : null,
    };
}

export function useUpdateSong() {
    const { trigger, isMutating, error } = useSWRMutation(
        'songs/update',
        async (_, { arg }: { arg: { id: number; data: Partial<SongResponse> } }) => {
            return await updateSong(arg.id, arg.data);
        }
    );

    return {
        updateSong: trigger,
        isUpdating: isMutating,
        error: error ? handleApiError(error) : null,
    };
}