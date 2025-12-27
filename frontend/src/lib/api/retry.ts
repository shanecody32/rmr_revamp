'use client'

import { AxiosError } from 'axios';

import type { ApiError } from '@/types/error';

import { handleApiError } from '../errors';

interface RetryOptions {
    maxRetries?: number;
    retryDelay?: number;
    shouldRetry?: (error: unknown, attempt: number) => boolean;
    onRetry?: (error: unknown, attempt: number) => void;
}

const defaultShouldRetry = (error: unknown, attempt: number): boolean => {
    if (attempt >= 3) return false;
    
    if (error instanceof AxiosError) {
        const status = error.response?.status;
        // Retry on network errors or 5xx errors
        return !status || status >= 500;
    }
    
    return false;
};

export async function withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const {
        maxRetries = 3,
        retryDelay = 1000,
        shouldRetry = defaultShouldRetry,
        onRetry,
    } = options;

    let lastError: unknown;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            
            if (attempt < maxRetries && shouldRetry(error, attempt)) {
                onRetry?.(error, attempt);
                
                // Exponential backoff
                const delay = retryDelay * Math.pow(2, attempt);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            
            break;
        }
    }
    
    throw lastError;
}

export function createRetryableRequest<T extends (...args: any[]) => Promise<any>>(
    request: T,
    options?: RetryOptions
): T {
    return ((...args) => withRetry(() => request(...args), options)) as T;
}