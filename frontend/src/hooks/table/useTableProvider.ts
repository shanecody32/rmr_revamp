'use client'

import {useCallback} from 'react';

import type {BaseEntity, NameFilterType} from '@/types/api/common';

import {useColumnVisibility} from './useColumnVisibility';
import {useTableData} from './useTableData';
import {useTableSearch} from './useTableSearch';

interface UseTableProviderParams<T extends BaseEntity> {
    fetchData: (params: Record<string, unknown>) => Promise<{ data: T[]; total: number }>;
    defaultColumns: string[];
    storageKey: string;
}

export function useTableProvider<T extends BaseEntity>({
                                                           fetchData,
                                                           defaultColumns,
                                                           storageKey
                                                       }: UseTableProviderParams<T>) {
    const search = useTableSearch();

    const {visibleColumns, setVisibleColumns} = useColumnVisibility({
        defaultColumns,
        storageKey
    });

    const tableData = useTableData<T>({
        fetchData,
        defaultParams: {
            name: search.searchTerm,
            name_filter_type: search.filterType
        }
    });

    const handleSearch = useCallback((term: string) => {
        search.setSearchTerm(term);
        tableData.loadData(1, undefined, undefined, {
            name: term,
            name_filter_type: search.filterType
        });
    }, [search, tableData]);

    const handleFilterTypeChange = useCallback((type: NameFilterType) => {
        search.setFilterType(type);
        tableData.loadData(1, undefined, undefined, {
            name: search.searchTerm,
            name_filter_type: type
        });
    }, [search, tableData]);

    return {
        table: tableData,
        search: {
            searchTerm: search.searchTerm,
            filterType: search.filterType,
            setSearchTerm: handleSearch,
            setFilterType: handleFilterTypeChange
        },
        columns: {
            visibleColumns,
            setVisibleColumns
        }
    };
}
