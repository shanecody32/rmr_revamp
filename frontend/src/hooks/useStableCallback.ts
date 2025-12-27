import {useCallback, useRef} from 'react';

export function useStableCallback<T extends (...args: unknown[]) => unknown>(callback: T): T {
    const callbackRef = useRef(callback);
    callbackRef.current = callback;

    return useCallback((...args: Parameters<T>) => {
        return callbackRef.current(...args);
    }, []) as T;
}
