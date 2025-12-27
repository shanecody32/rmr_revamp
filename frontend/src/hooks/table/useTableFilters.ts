import {useCallback, useState} from 'react';

export function useTableFilters() {
    const [filters, setFilters] = useState<Record<string, boolean>>({});

    const handleFilterChange = useCallback((newFilters: Record<string, boolean>) => {
        setFilters(newFilters);
    }, []);

    const resetFilters = useCallback(() => {
        setFilters({});
    }, []);

    return {
        filters,
        setFilters: handleFilterChange,
        resetFilters,
    };
}
