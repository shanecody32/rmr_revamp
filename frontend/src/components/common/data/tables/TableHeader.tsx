'use client'

import {FilterOutlined, PlusOutlined} from '@ant-design/icons';
import {Button, Space} from 'antd';

import TableToolbar from './TableToolbar';
import type {TableHeaderProps} from './TableTypes';

export default function TableHeader({
                                        searchTerm,
                                        onSearch,
                                        filterType,
                                        onFilterTypeChange,
                                        filters,
                                        onFilterChange,
                                        visibleColumns,
                                        onColumnChange,
                                        filterOptions,
                                        columnOptions,
                                        searchPlaceholder,
                                        onAdvancedSearch,
                                        onAdd,
                                        addButtonText = 'Add'
                                    }: TableHeaderProps) {
    return (
        <Space size="middle">
            <TableToolbar
                searchTerm={searchTerm}
                onSearch={onSearch}
                filterType={filterType}
                onFilterTypeChange={onFilterTypeChange}
                onFilterChange={onFilterChange}
                onColumnChange={onColumnChange}
                filterOptions={filterOptions}
                columnOptions={columnOptions}
                visibleColumns={visibleColumns}
                activeFilters={filters}
                searchPlaceholder={searchPlaceholder}
            />

            {onAdvancedSearch && (
                <Button
                    icon={<FilterOutlined/>}
                    onClick={onAdvancedSearch}
                >
                    Advanced Search
                </Button>
            )}

            {onAdd && (
                <Button
                    type="primary"
                    icon={<PlusOutlined/>}
                    onClick={onAdd}
                >
                    {addButtonText}
                </Button>
            )}
        </Space>
    );
}
