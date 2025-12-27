'use client'

import type {TablePaginationConfig} from 'antd/es/table';
import type {SorterResult} from 'antd/es/table/interface';
import {useCallback, useEffect, useRef, useState} from 'react';

import {useDebouncedValue} from '@/hooks/useDebouncedValue';
import {handleApiError} from '@/lib/errors';
import {ApiParams, PaginationResponse} from '@/types/api/common';
import type {ApiError} from '@/types/error';
import type {TableSortParams} from '@/types/table';

interface UseTableDataParams<T> {
    fetchData: (params: ApiParams & Record<string, unknown>) => Promise<{
        data: T[];
        pagination: PaginationResponse;
    }>;
    defaultParams?: Record<string, unknown>;
    onUnmount?: () => void;
}

export function useTableData<T>({
                                    fetchData,
                                    defaultParams = {},
                                    onUnmount
                                }: UseTableDataParams<T>) {
    const mounted = useRef(true);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<T[]>([]);
    const [total, setTotal] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<ApiParams['name_filter_type']>('startswith');
    const [error, setError] = useState<ApiError | null>(null);
    const [sortParams, setSortParams] = useState<TableSortParams>({});
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [filters, setFilters] = useState<Record<string, boolean>>({});
    const debouncedSearch = useDebouncedValue(searchTerm, 300);

    const fetchDataRef = useRef(fetchData);
    fetchDataRef.current = fetchData;

    const defaultParamsRef = useRef(defaultParams);
    defaultParamsRef.current = defaultParams;

    const latestRequestIdRef = useRef(0);

    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
            onUnmount?.();
        };
    }, [onUnmount]);

    const fetchTableData = useCallback(async (
        page?: number,
        size?: number,
        sort?: TableSortParams,
        additionalParams: Record<string, unknown> = {}
    ) => {
        if (!mounted.current) return;

        const requestId = ++latestRequestIdRef.current;

        setLoading(true);
        setError(null);

        try {
            const activeFilters = Object.fromEntries(
                Object.entries(filters).filter(([_, value]) => value)
            );

            const providedSort = sort ?? undefined;
            const shouldClearSort = providedSort !== undefined && (!providedSort.field || !providedSort.order);
            const effectiveSortField = shouldClearSort
                ? undefined
                : (providedSort?.field ?? sortParams.field);
            const effectiveSortOrder = shouldClearSort
                ? null
                : (providedSort?.order ?? sortParams.order ?? null);

            const sortAscending = effectiveSortOrder === 'ascend'
                ? true
                : effectiveSortOrder === 'descend'
                    ? false
                    : undefined;

            const params = {
                page: page || currentPage,
                page_size: size || pageSize,
                sort_field: effectiveSortField || undefined,
                sort_ascending: sortAscending,
                name: searchTerm,
                name_filter_type: filterType,
                filters: Object.keys(activeFilters).length > 0 ? activeFilters : undefined,
                ...defaultParamsRef.current,
                ...additionalParams,
            };

            const result = await fetchDataRef.current(params);

            if (mounted.current && requestId === latestRequestIdRef.current) {
                setData(result.data);
                setPageSize(result.pagination.page_size);
                setCurrentPage(result.pagination.page);
                const totalCount = result.pagination.total_count ?? result.pagination.total_items ?? 0;
                setTotal(totalCount);
                setTotalPages(result.pagination.total_pages);
            }
        } catch (err) {
            if (mounted.current && requestId === latestRequestIdRef.current) {
                const apiError = handleApiError(err);
                setError(apiError);
                setData([]);
                setTotal(0);
            }
        } finally {
            if (mounted.current && requestId === latestRequestIdRef.current) {
                setLoading(false);
            }
        }
    }, [currentPage, pageSize, totalPages, total, sortParams, debouncedSearch, filterType, filters]);

    useEffect(() => {
        fetchTableData();
    }, [fetchTableData]);

    const handleFilterChange = useCallback((newFilters: Record<string, boolean>) => {
        if (mounted.current) {
            setFilters(newFilters);
            setCurrentPage(1);
        }
    }, []);

    const handleSearch = useCallback((value: string) => {
        if (mounted.current) {
            setSearchTerm(value);
            setCurrentPage(1);
        }
    }, []);

    const handleFilterTypeChange = useCallback((value: ApiParams['name_filter_type']) => {
        if (mounted.current) {
            setFilterType(value);
            setCurrentPage(1);
        }
    }, []);

    const handleTableChange = useCallback((
        pagination: TablePaginationConfig,
        _filters: unknown,
        sorter: SorterResult<T> | SorterResult<T>[]
    ) => {
        if (!mounted.current) return;

        const singleSorter = Array.isArray(sorter) ? sorter[0] : sorter;

        const rawField = singleSorter?.field ?? singleSorter?.columnKey;
        const normalizedField = typeof rawField === 'string'
            ? rawField
            : rawField != null
                ? String(rawField)
                : undefined;
        const normalizedOrder = singleSorter?.order ?? null;
        const hasOrder = normalizedField && (normalizedOrder === 'ascend' || normalizedOrder === 'descend');

        const newSortParams: TableSortParams = hasOrder
            ? {
                field: normalizedField,
                order: normalizedOrder,
            }
            : {};

        setSortParams(newSortParams);
        setCurrentPage(pagination.current || 1);
        setPageSize(pagination.pageSize || 10);

        fetchTableData(
            pagination.current,
            pagination.pageSize,
            hasOrder
                ? newSortParams
                : {field: null, order: null}
        );
    }, [fetchTableData]);

    return {
        loading,
        data,
        total,
        error,
        currentPage,
        pageSize,
        searchTerm,
        setSearchTerm: handleSearch,
        filterType,
        setFilterType: handleFilterTypeChange,
        filters,
        setFilters: handleFilterChange,
        loadData: fetchTableData,
        refresh: fetchTableData,
        sortParams,
        handleTableChange,
    };
}
