import {useCallback, useState} from 'react';

import type {NameFilterType} from '@/types/api/common';

export function useSearch() {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<NameFilterType>('contains');

    const handleSearch = useCallback((value: string) => {
        setSearchTerm(value);
    }, []);

    const handleFilterTypeChange = useCallback((value: NameFilterType) => {
        setFilterType(value);
    }, []);

    return {
        searchTerm,
        filterType,
        handleSearch,
        handleFilterTypeChange,
    };
}