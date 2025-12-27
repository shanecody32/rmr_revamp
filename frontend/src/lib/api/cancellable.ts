'use client'

import type { AxiosRequestConfig } from 'axios';
import * as React from 'react';

import { api } from './config';

export function createCancellableRequest<T>(
    requestFn: (config?: AxiosRequestConfig) => Promise<T>,
    requestKey?: string
) {
    return (config?: AxiosRequestConfig): Promise<T> => {
        const enhancedConfig: AxiosRequestConfig = {
            ...config,
            headers: {
                ...config?.headers,
                ...(requestKey ? { 'X-Request-Key': requestKey } : {}),
            },
        };
        
        return requestFn(enhancedConfig);
    };
}

export function useCancellableEffect(
    effect: (signal: AbortSignal) => Promise<void> | void,
    deps?: React.DependencyList
) {
    const abortControllerRef = React.useRef<AbortController | null>(null);

    React.useEffect(() => {
        const controller = new AbortController();
        abortControllerRef.current = controller;
        const signal = controller.signal;

        effect(signal);

        return () => {
            controller.abort();
            abortControllerRef.current = null;
        };
    }, deps);
}