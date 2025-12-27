import {message} from "antd";

import type {ApiError} from '@/types/error';

export function showErrorMessage(error: ApiError) {
    const msg = error.message || 'An unexpected error occurred';
    message.error({
        content: msg,
        key: 'error',
        duration: 3,
    });
}

export function handleLoadError(error: unknown, callback?: () => void) {
    showErrorMessage(error as ApiError);
    if (callback) {
        callback();
    }
}
