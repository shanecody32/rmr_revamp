'use client'

import {FilterOutlined} from '@ant-design/icons';
import {Button, Space} from 'antd';

import type {FilterOption} from '@/lib/config/filterOptions';
import type {NameFilterType} from '@/types/api/common';

import ColumnCustomizer from '../ColumnCustomizer';

import TableFilter from './TableFilter';
import TableSearch from './TableSearch';


interface TableToolbarProps {
    onSearch: (value: string) => void;
    onFilterTypeChange: (type: NameFilterType) => void;
    onFilterChange: (filters: Record<string, boolean>) => void;
    onColumnChange: (columns: string[]) => void;
    filterOptions: FilterOption[];
    columnOptions: Array<{
        key: string;
        label: string;
        required?: boolean;
    }>;
    visibleColumns: string[];
    activeFilters: Record<string, boolean>;
    searchPlaceholder?: string;
    searchTerm: string;
    filterType: NameFilterType;
    onAdvancedSearch?: () => void;
}

export default function TableToolbar({
                                         onSearch,
                                         onFilterTypeChange,
                                         onFilterChange,
                                         onColumnChange,
                                         filterOptions,
                                         columnOptions,
                                         visibleColumns,
                                         activeFilters,
                                         searchPlaceholder,
                                         searchTerm,
                                         filterType,
                                         onAdvancedSearch
                                     }: TableToolbarProps) {
    return (
        <Space size="middle" wrap>
            <Space.Compact>
                <TableSearch
                    value={searchTerm}
                    onChange={onSearch}
                    filterType={filterType}
                    onFilterTypeChange={onFilterTypeChange}
                    placeholder={searchPlaceholder}
                />
                {onAdvancedSearch && (
                    <Button
                        icon={<FilterOutlined/>}
                        onClick={onAdvancedSearch}
                        title="Advanced Search"
                    />
                )}
            </Space.Compact>

            <TableFilter
                options={filterOptions}
                activeFilters={activeFilters}
                onChange={onFilterChange}
                onReset={() => onFilterChange({})}
            />

            <ColumnCustomizer
                columns={columnOptions}
                visibleColumns={visibleColumns}
                onChange={onColumnChange}
            />
        </Space>
    );
}
