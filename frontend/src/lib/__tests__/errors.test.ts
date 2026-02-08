import { describe, it, expect } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import { handleApiError } from '../errors';

describe('handleApiError', () => {
    it('returns 408 for ECONNABORTED', () => {
        const error = new AxiosError('timeout', 'ECONNABORTED');
        const result = handleApiError(error);
        expect(result.status).toBe(408);
        expect(result.message).toContain('timeout');
    });

    it('returns 500 with network error when no response', () => {
        const error = new AxiosError('Network Error', 'ERR_NETWORK');
        const result = handleApiError(error);
        expect(result.status).toBe(500);
        expect(result.message).toContain('Network error');
    });

    it('extracts status and message from response data', () => {
        const error = new AxiosError('Request failed');
        error.response = {
            status: 422,
            statusText: 'Unprocessable Entity',
            data: { message: 'Validation failed' },
            headers: {},
            config: { headers: new AxiosHeaders() },
        };
        const result = handleApiError(error);
        expect(result.status).toBe(422);
        expect(result.message).toBe('Validation failed');
    });

    it('forwards details from response data', () => {
        const error = new AxiosError('Request failed');
        error.response = {
            status: 400,
            statusText: 'Bad Request',
            data: {
                message: 'Invalid',
                details: { name: ['required'] },
            },
            headers: {},
            config: { headers: new AxiosHeaders() },
        };
        const result = handleApiError(error);
        expect(result.details).toEqual({ name: ['required'] });
    });

    it('falls back to error.message when no data.message', () => {
        const error = new AxiosError('Original axios message');
        error.response = {
            status: 500,
            statusText: 'Internal Server Error',
            data: {},
            headers: {},
            config: { headers: new AxiosHeaders() },
        };
        const result = handleApiError(error);
        expect(result.message).toBe('Original axios message');
    });

    it('handles plain Error', () => {
        const error = new Error('something broke');
        const result = handleApiError(error);
        expect(result.status).toBe(500);
        expect(result.message).toBe('something broke');
    });

    it('handles unknown string value', () => {
        const result = handleApiError('unexpected');
        expect(result.status).toBe(500);
        expect(result.message).toBe('An unexpected error occurred');
    });

    it('handles unknown number value', () => {
        const result = handleApiError(42);
        expect(result.status).toBe(500);
        expect(result.message).toBe('An unexpected error occurred');
    });
});
