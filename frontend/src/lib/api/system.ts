'use client'

import { api } from './config';
import type { BackfillJobState, TaskJobState } from '@/types/api/system';

export const systemApi = {
    async triggerBackfill(): Promise<string> {
        const response = await api.post('/system/backfill-similarity', {});
        return response.data;
    },

    async getBackfillProgress(): Promise<BackfillJobState> {
        const response = await api.get<BackfillJobState>('/system/backfill-progress');
        return response.data;
    },

    async triggerAlbumGenreUpdate(): Promise<string> {
        const response = await api.post('/system/update-album-genres', {});
        return response.data;
    },

    async getAlbumGenreUpdateProgress(): Promise<TaskJobState> {
        const response = await api.get<TaskJobState>('/system/update-album-genres-progress');
        return response.data;
    }
};
