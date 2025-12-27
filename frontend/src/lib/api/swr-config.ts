'use client'

import type { SWRConfiguration } from 'swr';

import { handleApiError } from '../errors';

export const defaultSWRConfig: SWRConfiguration = {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 2000,
    errorRetryCount: 3,
    errorRetryInterval: 1000,
    shouldRetryOnError: (error) => {
        // Don't retry on 4xx errors
        return !(error?.status >= 400 && error?.status < 500);

    },
    onError: (error) => {
        console.error('SWR Error:', handleApiError(error));
    },
};