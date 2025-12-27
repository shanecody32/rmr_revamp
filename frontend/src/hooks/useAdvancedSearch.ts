'use client'

import {useCallback, useState} from 'react';

import type {NameFilterType} from '@/types/api/common';

interface UseAdvancedSearchResult {
    isOpen: boolean;
    filters: Record<string, unknown>;
    filterType: NameFilterType;
    setIsOpen: (open: boolean) => void;
    handleSearch: (newFilters: Record<string, unknown>) => void;
    handleFilterTypeChange: (type: NameFilterType) => void;
    resetFilters: () => void;
}

export function useAdvancedSearch(
    onSearch: (filters: Record<string, unknown>) => void,
    onFilterTypeChange: (type: NameFilterType) => void
): UseAdvancedSearchResult {
    const [isOpen, setIsOpen] = useState(false);
    const [filters, setFilters] = useState<Record<string, unknown>>({});
    const [filterType, setFilterType] = useState<NameFilterType>('startswith');

    const handleSearch = useCallback((newFilters: Record<string, unknown>) => {
        setFilters(newFilters);
        onSearch(newFilters);
    }, [onSearch]);

    const handleFilterTypeChange = useCallback((type: NameFilterType) => {
        setFilterType(type);
        onFilterTypeChange(type);
    }, [onFilterTypeChange]);

    const resetFilters = useCallback(() => {
        setFilters({});
        setFilterType('startswith');
        onSearch({});
        onFilterTypeChange('startswith');
    }, [onSearch, onFilterTypeChange]);

    return {
        isOpen,
        filters,
        filterType,
        setIsOpen,
        handleSearch,
        handleFilterTypeChange,
        resetFilters
    };
}
