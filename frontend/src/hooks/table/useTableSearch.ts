'use client'

import {useCallback, useState} from 'react';

import type {NameFilterType} from '@/types/api/common';

interface UseTableSearchResult {
    searchTerm: string;
    filterType: NameFilterType;
    setSearchTerm: (term: string) => void;
    setFilterType: (type: NameFilterType) => void;
    resetSearch: () => void;
}

export function useTableSearch(): UseTableSearchResult {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<NameFilterType>('contains');

    const handleSearchTermChange = useCallback((term: string) => {
        setSearchTerm(term);
    }, []);

    const handleFilterTypeChange = useCallback((type: NameFilterType) => {
        setFilterType(type);
    }, []);

    const resetSearch = useCallback(() => {
        setSearchTerm('');
        setFilterType('contains');
    }, []);

    return {
        searchTerm,
        filterType,
        setSearchTerm: handleSearchTermChange,
        setFilterType: handleFilterTypeChange,
        resetSearch
    };
}
