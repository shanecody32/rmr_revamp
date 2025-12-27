'use client'

/**
 * Serializes API parameters into a stable key for caching
 */
export function serializeParams(params: Record<string, unknown>): string {
    const sorted = Object.keys(params)
        .sort()
        .reduce((acc, key) => {
            if (params[key] !== undefined && params[key] !== null) {
                acc[key] = params[key];
            }
            return acc;
        }, {} as Record<string, unknown>);
    
    return JSON.stringify(sorted);
}

/**
 * Creates a stable SWR key from endpoint and params
 */
export function createSWRKey(endpoint: string, params?: Record<string, unknown>): string | [string, Record<string, unknown>] {
    if (!params || Object.keys(params).length === 0) {
        return endpoint;
    }
    return [endpoint, params];
}

/**
 * Debounces a function call
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
    func: T,
    delay: number
): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;
    
    return (...args: Parameters<T>) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
}

/**
 * Transforms API parameters to remove undefined values
 */
export function cleanParams<T extends Record<string, unknown>>(params: T): Partial<T> {
    const cleaned: Record<string, unknown> = {};

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            cleaned[key] = value;
        }
    });

    return cleaned as Partial<T>;
}