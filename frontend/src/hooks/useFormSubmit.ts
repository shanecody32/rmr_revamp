'use client'

import {App} from 'antd';
import {useState} from 'react';

import {handleApiError} from '@/lib/errors';
import type {ApiError} from '@/types/error';

interface UseFormSubmitParams<T, R = T> {
    onSubmit: (data: T) => Promise<R | null>;
    onSuccess?: () => void;
    successMessage?: string;
    skipSuccessMessage?: boolean;
}

export function useFormSubmit<T, R = T>({
                                            onSubmit,
                                            onSuccess,
                                            successMessage = 'Successfully created',
                                            skipSuccessMessage = false
                                        }: UseFormSubmitParams<T, R>) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<ApiError | null>(null);
    const {message} = App.useApp();

    const handleSubmit = async (data: T): Promise<R | null> => {
        setLoading(true);
        setError(null);

        try {
            const result = await onSubmit(data);

            // Only show success message if not skipped and we have a result
            if (!skipSuccessMessage && result) {
                message.success(successMessage);
            }

            if (result) {
                onSuccess?.();
            }

            return result;
        } catch (err) {
            const apiError = handleApiError(err);
            setError(apiError);
            message.error(apiError.message);
            return null;
        } finally {
            setLoading(false);
        }
    };

    return {
        loading,
        error,
        handleSubmit,
    };
}
