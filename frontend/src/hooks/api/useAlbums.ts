'use client'

import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';

import { api } from '@/lib/api/config';
import { handleApiError } from '@/lib/errors';
import type { AlbumResponse } from '@/types/api/albums';
import type { ApiParams, ApiResponse } from '@/types/api/common';

async function fetchAlbums(params: ApiParams): Promise<{ data: AlbumResponse[]; total: number }> {
    const response = await api.get<ApiResponse<AlbumResponse>>('/albums', { params });
    
    return {
        data: response.data.results,
        total: response.data.pagination?.total_count || response.data.results.length,
    };
}

async function fetchAlbumById(id: number): Promise<AlbumResponse> {
    const response = await api.get<AlbumResponse>(`/albums/${id}`);
    return response.data;
}

async function createAlbum(data: Partial<AlbumResponse>): Promise<AlbumResponse> {
    const response = await api.post<AlbumResponse>('/albums', data);
    return response.data;
}

async function updateAlbum(id: number, data: Partial<AlbumResponse>): Promise<AlbumResponse> {
    const response = await api.put<AlbumResponse>(`/albums/${id}`, data);
    return response.data;
}

export function useAlbums(params: ApiParams) {
    const key = ['albums', params];
    
    const { data, error, isLoading, mutate } = useSWR(
        key,
        () => fetchAlbums(params),
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            dedupingInterval: 2000,
        }
    );

    return {
        albums: data?.data || [],
        total: data?.total || 0,
        isLoading,
        error: error ? handleApiError(error) : null,
        refresh: () => mutate(),
        mutate,
    };
}

export function useAlbum(id: number | null) {
    const { data, error, isLoading, mutate } = useSWR(
        id ? ['album', id] : null,
        () => fetchAlbumById(id!),
        {
            revalidateOnFocus: false,
            dedupingInterval: 5000,
        }
    );

    return {
        album: data,
        isLoading,
        error: error ? handleApiError(error) : null,
        refresh: () => mutate(),
        mutate,
    };
}

export function useCreateAlbum() {
    const { trigger, isMutating, error } = useSWRMutation(
        'albums/create',
        async (_, { arg }: { arg: Partial<AlbumResponse> }) => {
            return await createAlbum(arg);
        }
    );

    return {
        createAlbum: trigger,
        isCreating: isMutating,
        error: error ? handleApiError(error) : null,
    };
}

export function useUpdateAlbum() {
    const { trigger, isMutating, error } = useSWRMutation(
        'albums/update',
        async (_, { arg }: { arg: { id: number; data: Partial<AlbumResponse> } }) => {
            return await updateAlbum(arg.id, arg.data);
        }
    );

    return {
        updateAlbum: trigger,
        isUpdating: isMutating,
        error: error ? handleApiError(error) : null,
    };
}