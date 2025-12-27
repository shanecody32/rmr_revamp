import type {TablePaginationConfig} from 'antd/es/table';
import type {SorterResult} from 'antd/es/table/interface';

import type {NameFilterType} from '@/types/api/common';
import type {TableSortParams} from '@/types/table';

export interface BaseTableProps<T> {
    data: T[];
    loading: boolean;
    currentPage: number;
    pageSize: number;
    total: number;
    sortParams: TableSortParams;
    onTableChange: (
        pagination: TablePaginationConfig,
        _filters: Record<string, unknown>,
        sorter: SorterResult<T> | SorterResult<T>[]
    ) => void;
    onRowClick?: (record: T) => void;
    visibleColumns: string[];
}

export interface TableHeaderProps {
    searchTerm: string;
    onSearch: (value: string) => void;
    filterType: NameFilterType;
    onFilterTypeChange: (value: NameFilterType) => void;
    filters: Record<string, boolean>;
    onFilterChange: (filters: Record<string, boolean>) => void;
    visibleColumns: string[];
    onColumnChange: (columns: string[]) => void;
    filterOptions: Array<{
        key: string;
        label: string;
        description: string;
    }>;
    columnOptions: Array<{
        key: string;
        label: string;
        required?: boolean;
    }>;
    searchPlaceholder?: string;
    onAdvancedSearch?: () => void;
    onAdd?: () => void;
    addButtonText?: string;
}
