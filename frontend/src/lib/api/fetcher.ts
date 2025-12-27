'use client'

import { handleApiError } from '../errors';

import { api } from './config';

export const fetcher = async (url: string) => {
    try {
        const response = await api.get(url);
        return response.data;
    } catch (error) {
        throw handleApiError(error);
    }
};

export const fetcherWithParams = async ([url, params]: [string, Record<string, unknown>?]) => {
    try {
        const response = await api.get(url, { params });
        return response.data;
    } catch (error) {
        throw handleApiError(error);
    }
};