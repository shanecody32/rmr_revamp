'use client'

import {useCallback, useState} from 'react';

import type {NameFilterType} from '@/types/api/common';

interface UseAdvancedSearchResult {
    isOpen: boolean;
    filters: Record<string, any>;
    filterType: NameFilterType;
    setIsOpen: (open: boolean) => void;
    handleSearch: (newFilters: Record<string, any>) => void;
    handleFilterTypeChange: (type: NameFilterType) => void;
    resetFilters: () => void;
}

export function useAdvancedSearch(
    onSearch: (filters: Record<string, any>) => void,
    onFilterTypeChange: (type: NameFilterType) => void
): UseAdvancedSearchResult {
    const [isOpen, setIsOpen] = useState(false);
    const [filters, setFilters] = useState<Record<string, any>>({});
    const [filterType, setFilterType] = useState<NameFilterType>('startswith');

    const handleSearch = useCallback((newFilters: Record<string, any>) => {
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
