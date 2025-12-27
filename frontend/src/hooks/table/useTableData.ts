'use client'

import type {TablePaginationConfig} from 'antd/es/table';
import type {SorterResult} from 'antd/es/table/interface';
import {useCallback, useEffect, useRef, useState} from 'react';

import {handleApiError} from '@/lib/errors';
import type {ApiParams} from '@/types/api/common';
import type {ApiError} from '@/types/error';

interface UseTableDataParams<T> {
    fetchData: (params: ApiParams & Record<string, any>) => Promise<{
        data: T[];
        total: number;
    }>;
    defaultParams?: Record<string, any>;
    onUnmount?: () => void;
}

interface TableSortParams {
    field?: string;
    order?: 'ascend' | 'descend' | null;
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
    const [filters, setFilters] = useState<Record<string, boolean>>({});

    const fetchDataRef = useRef(fetchData);
    fetchDataRef.current = fetchData;

    const defaultParamsRef = useRef(defaultParams);
    defaultParamsRef.current = defaultParams;

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
        additionalParams: Record<string, any> = {}
    ) => {
        if (!mounted.current) return;

        setLoading(true);
        setError(null);

        try {
            const activeFilters = Object.fromEntries(
                Object.entries(filters).filter(([_, value]) => value === true)
            );

            const params = {
                page: page || currentPage,
                page_size: size || pageSize,
                sort_field: sort?.field || sortParams.field,
                sort_ascending: sort?.order === 'ascend',
                name: searchTerm,
                name_filter_type: filterType,
                filters: Object.keys(activeFilters).length > 0 ? activeFilters : undefined,
                ...defaultParamsRef.current,
                ...additionalParams,
            };

            const result = await fetchDataRef.current(params);

            if (mounted.current) {
                setData(result.data);
                setTotal(result.total);
            }
        } catch (err) {
            if (mounted.current) {
                const apiError = handleApiError(err);
                setError(apiError);
                setData([]);
                setTotal(0);
            }
        } finally {
            if (mounted.current) {
                setLoading(false);
            }
        }
    }, [currentPage, pageSize, sortParams, searchTerm, filterType, filters]);

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
        _filters: any,
        sorter: SorterResult<T> | SorterResult<T>[]
    ) => {
        if (!mounted.current) return;

        const singleSorter = Array.isArray(sorter) ? sorter[0] : sorter;
        const newSortParams = {
            field: singleSorter.field as string,
            order: singleSorter.order,
        };
        setSortParams(newSortParams);
        setCurrentPage(pagination.current || 1);
        setPageSize(pagination.pageSize || 10);

        fetchTableData(
            pagination.current,
            pagination.pageSize,
            newSortParams
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
