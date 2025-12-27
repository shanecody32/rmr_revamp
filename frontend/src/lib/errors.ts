import {AxiosError} from 'axios';

import type {ApiError} from '@/types/error';

export function handleApiError(error: unknown): ApiError {
    if (error instanceof AxiosError) {
        if (error.code === 'ECONNABORTED') {
            return {
                status: 408,
                message: 'Request timeout - please try again',
            };
        }
        if (!error.response) {
            return {
                status: 500,
                message: 'Network error - please check your connection',
            };
        }
        return {
            status: error.response.status,
            message: error.response.data?.message || error.message,
            details: error.response.data?.details,
        };
    }

    if (error instanceof Error) {
        return {
            status: 500,
            message: error.message,
        };
    }

    return {
        status: 500,
        message: 'An unexpected error occurred',
    };
}