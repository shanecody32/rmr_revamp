import type {TablePaginationConfig} from 'antd/es/table';
import type {SorterResult} from 'antd/es/table/interface';

import type {NameFilterType} from './api/common';

export interface TableSortParams {
    field?: string | null;
    order?: 'ascend' | 'descend' | null;
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

export interface TableData<T> {
    loading: boolean;
    data: T[];
    total: number;
    error: unknown;
    currentPage: number;
    pageSize: number;
    filters: Record<string, boolean>;
    setFilters: (filters: Record<string, boolean>) => void;
    refresh: () => void;
    sortParams: TableSortParams;
    handleTableChange: (
        pagination: TablePaginationConfig,
        _: unknown,
        sorter: SorterResult<T> | SorterResult<T>[]
    ) => void;
}

export interface DrawerProps<T> {
    visible: boolean;
    selectedItem: T | null;
    onClose: () => void;
}

export interface ModalProps {
    isAddModalOpen: boolean;
    setIsAddModalOpen: (open: boolean) => void;
    isAdvancedSearchOpen: boolean;
    setIsAdvancedSearchOpen: (open: boolean) => void;
}

export interface ColumnProps {
    visibleColumns: string[];
    setVisibleColumns: (columns: string[]) => void;
}

export interface AdvancedSearchProps {
    onSearch: (filters: Record<string, unknown>) => void;
    onReset: () => void;
}
