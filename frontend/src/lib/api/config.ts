import axios from 'axios';

import {config} from '../config';
import {clearStoredAuthToken, getStoredAuthToken} from '../auth/token';

// Create axios instance with proper response structure handling
export const api = axios.create({
    baseURL: config.api.baseUrl,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: config.api.timeout,
    validateStatus: (status) => {
        return status >= 200 && status < 500;
    }
});

// Track active requests for cancellation
const activeRequests = new Map<string, AbortController>();

export function cancelRequest(key: string) {
    const controller = activeRequests.get(key);
    if (controller) {
        controller.abort();
        activeRequests.delete(key);
    }
}

export function cancelAllRequests() {
    activeRequests.forEach(controller => controller.abort());
    activeRequests.clear();
}

// Add request interceptor for cancellation support
api.interceptors.request.use(
    (config) => {
        // Add cancellation support if a key is provided
        const requestKey = config.headers?.['X-Request-Key'] as string;
        if (requestKey) {
            // Cancel any existing request with the same key
            cancelRequest(requestKey);
            
            // Create new AbortController
            const controller = new AbortController();
            activeRequests.set(requestKey, controller);
            config.signal = controller.signal;
            
            // Clean up header
            delete config.headers['X-Request-Key'];
        }

        const token = getStoredAuthToken();
        if (token) {
            config.headers = config.headers ?? {};
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Add response interceptor to handle error responses
api.interceptors.response.use(
    (response) => {
        // Check if response status indicates an error (4xx range that validateStatus let through)
        if (response.status >= 400) {
            return Promise.reject({
                status: response.status,
                message: response.data?.message || response.data?.error || `Request failed with status ${response.status}`,
                details: response.data?.details || response.data
            });
        }
        // Simply return the response as-is, don't modify pagination
        return response;
    },
    (error) => {
        // Transform error response
        if (error.response) {
            if (error.response.status === 401) {
                clearStoredAuthToken();
            }
            return Promise.reject({
                status: error.response.status,
                message: error.response.data?.message || 'An error occurred',
                details: error.response.data?.details
            });
        }
        if (error.code === 'ECONNABORTED') {
            return Promise.reject({
                status: 408,
                message: 'Request timeout - please try again'
            });
        }
        return Promise.reject({
            status: 500,
            message: error.message || 'Network error occurred'
        });
    }
);
