'use client'

import {FilterOutlined, PlusOutlined} from '@ant-design/icons';
import {Button, Space} from 'antd';

import type {NameFilterType} from '@/types/api/common';
import type {ColumnProps} from '@/types/table';

import BandsToolbar from './BandsToolbar';

interface BandsActionsProps {
    tableData: {
        searchTerm: string;
        setSearchTerm: (term: string) => void;
        filterType: NameFilterType;
        setFilterType: (type: NameFilterType) => void;
        filters: Record<string, boolean>;
        setFilters: (filters: Record<string, boolean>) => void;
    };
    columnProps: ColumnProps;
    onAdvancedSearchClick: () => void;
    onAddClick: () => void;
}

export default function BandsActions({
                                         tableData,
                                         columnProps,
                                         onAdvancedSearchClick,
                                         onAddClick
                                     }: BandsActionsProps) {
    return (
        <Space size="middle">
            <BandsToolbar
                searchTerm={tableData.searchTerm}
                setSearchTerm={tableData.setSearchTerm}
                filterType={tableData.filterType}
                setFilterType={tableData.setFilterType}
                filters={tableData.filters}
                setFilters={tableData.setFilters}
                visibleColumns={columnProps.visibleColumns}
                setVisibleColumns={columnProps.setVisibleColumns}
            />
            <Button
                icon={<FilterOutlined/>}
                onClick={onAdvancedSearchClick}
            >
                Advanced Search
            </Button>
            <Button
                type="primary"
                icon={<PlusOutlined/>}
                onClick={onAddClick}
            >
                Add Band
            </Button>
        </Space>
    );
}
