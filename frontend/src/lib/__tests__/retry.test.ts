import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import { withRetry, createRetryableRequest } from '../api/retry';

describe('withRetry', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('succeeds on first try without retrying', async () => {
        const fn = vi.fn().mockResolvedValue('ok');
        const result = await withRetry(fn);
        expect(result).toBe('ok');
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it('retries on network error then succeeds', async () => {
        const networkError = new AxiosError('Network Error', 'ERR_NETWORK');
        const fn = vi.fn()
            .mockRejectedValueOnce(networkError)
            .mockResolvedValueOnce('recovered');

        const promise = withRetry(fn);
        await vi.advanceTimersByTimeAsync(1000); // first retry delay
        const result = await promise;

        expect(result).toBe('recovered');
        expect(fn).toHaveBeenCalledTimes(2);
    });

    it('retries on 500 error', async () => {
        const serverError = new AxiosError('Server Error');
        serverError.response = {
            status: 500,
            statusText: 'Internal Server Error',
            data: {},
            headers: {},
            config: { headers: new AxiosHeaders() },
        };

        const fn = vi.fn()
            .mockRejectedValueOnce(serverError)
            .mockResolvedValueOnce('ok');

        const promise = withRetry(fn);
        await vi.advanceTimersByTimeAsync(1000);
        const result = await promise;

        expect(result).toBe('ok');
        expect(fn).toHaveBeenCalledTimes(2);
    });

    it('does NOT retry on 400 error', async () => {
        const clientError = new AxiosError('Bad Request');
        clientError.response = {
            status: 400,
            statusText: 'Bad Request',
            data: {},
            headers: {},
            config: { headers: new AxiosHeaders() },
        };

        const fn = vi.fn().mockRejectedValue(clientError);

        await expect(withRetry(fn)).rejects.toThrow();
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it('respects maxRetries limit', async () => {
        const networkError = new AxiosError('Network Error', 'ERR_NETWORK');
        const fn = vi.fn().mockRejectedValue(networkError);

        // Use a caught promise to avoid unhandled rejection
        let caughtError: unknown = null;
        const promise = withRetry(fn, { maxRetries: 2 }).catch((e) => {
            caughtError = e;
        });
        await vi.advanceTimersByTimeAsync(1000); // first retry delay (1000 * 2^0)
        await vi.advanceTimersByTimeAsync(2000); // second retry delay (1000 * 2^1)
        await promise;

        expect(caughtError).toBe(networkError);
        expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it('calls onRetry callback with attempt number', async () => {
        const networkError = new AxiosError('Network Error', 'ERR_NETWORK');
        const onRetry = vi.fn();
        const fn = vi.fn()
            .mockRejectedValueOnce(networkError)
            .mockResolvedValueOnce('ok');

        const promise = withRetry(fn, { onRetry });
        await vi.advanceTimersByTimeAsync(1000);
        await promise;

        expect(onRetry).toHaveBeenCalledTimes(1);
        expect(onRetry).toHaveBeenCalledWith(networkError, 0);
    });

    it('uses exponential backoff delays', async () => {
        const networkError = new AxiosError('Network Error', 'ERR_NETWORK');
        const fn = vi.fn()
            .mockRejectedValueOnce(networkError)
            .mockRejectedValueOnce(networkError)
            .mockResolvedValueOnce('ok');

        const promise = withRetry(fn, { retryDelay: 1000 });

        // After 999ms, should still only have called once (initial)
        await vi.advanceTimersByTimeAsync(999);
        expect(fn).toHaveBeenCalledTimes(1);

        // First retry at 1000ms (1000 * 2^0)
        await vi.advanceTimersByTimeAsync(1);
        expect(fn).toHaveBeenCalledTimes(2);

        // Second retry at 2000ms (1000 * 2^1)
        await vi.advanceTimersByTimeAsync(2000);
        const result = await promise;

        expect(result).toBe('ok');
        expect(fn).toHaveBeenCalledTimes(3);
    });
});

describe('createRetryableRequest', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('wraps function with retry behavior', async () => {
        const originalFn = vi.fn().mockResolvedValue('data');
        const retryable = createRetryableRequest(originalFn);

        const result = await retryable('arg1', 'arg2');
        expect(result).toBe('data');
        expect(originalFn).toHaveBeenCalledWith('arg1', 'arg2');
    });
});
