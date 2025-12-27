import type {TablePaginationConfig} from 'antd/es/table';
import type {SorterResult} from 'antd/es/table/interface';
import {useCallback, useState} from 'react';

import type {ApiParams} from '@/types/api/common';

interface TableState {
    page: number;
    sortField?: string;
    sortOrder?: 'ascend' | 'descend' | null;
}

export function useTableState() {
    const [state, setState] = useState<TableState>({
        page: 1,
    });

    const handleTableChange = useCallback((
        pagination: TablePaginationConfig,
        _filters: Record<string, unknown>,
        sorter: SorterResult<unknown> | SorterResult<unknown>[]
    ) => {
        const singleSorter = Array.isArray(sorter) ? sorter[0] : sorter;
        setState({
            page: pagination.current || 1,
            sortField: singleSorter.field as string,
            sortOrder: singleSorter.order,
        });
    }, []);

    const getQueryParams = useCallback((): Partial<ApiParams> => {
        return {
            page: state.page,
            sort_field: state.sortField,
            sort_ascending: state.sortOrder === 'ascend',
        };
    }, [state]);

    return {
        state,
        handleTableChange,
        getQueryParams,
    };
}
