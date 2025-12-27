import {useCallback, useState} from 'react';

interface UseColumnVisibilityParams {
    defaultColumns: string[];
    storageKey?: string;
}

export function useColumnVisibility({
                                        defaultColumns,
                                        storageKey,
                                    }: UseColumnVisibilityParams) {
    // Load initial state from localStorage if available
    const getInitialColumns = () => {
        if (storageKey && typeof window !== 'undefined') {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                return JSON.parse(saved);
            }
        }
        return defaultColumns;
    };

    const [visibleColumns, setVisibleColumns] = useState<string[]>(getInitialColumns);

    const updateVisibleColumns = useCallback((columns: string[]) => {
        setVisibleColumns(columns);
        if (storageKey && typeof window !== 'undefined') {
            localStorage.setItem(storageKey, JSON.stringify(columns));
        }
    }, [storageKey]);

    return {
        visibleColumns,
        setVisibleColumns: updateVisibleColumns,
    };
}
