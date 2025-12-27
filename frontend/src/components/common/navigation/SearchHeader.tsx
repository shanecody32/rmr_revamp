'use client'

import {SearchOutlined} from '@ant-design/icons';
import {Input, Select, Space} from 'antd';
import {useCallback} from 'react';

import type {NameFilterType} from '@/types/api/common';


interface SearchHeaderProps {
    onSearch: (value: string) => void;
    onFilterTypeChange: (value: NameFilterType) => void;
    placeholder?: string;
}

const filterOptions = [
    {value: 'contains', label: 'Contains'},
    {value: 'starts_with', label: 'Starts With'},
    {value: 'ends_with', label: 'Ends With'},
    {value: 'exact', label: 'Exact Match'},
];

export default function SearchHeader({
                                         onSearch,
                                         onFilterTypeChange,
                                         placeholder = 'Search...'
                                     }: SearchHeaderProps) {
    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        onSearch(e.target.value);
    }, [onSearch]);

    return (
        <div suppressHydrationWarning>
            <Space>
                <Input
                    placeholder={placeholder}
                    prefix={<SearchOutlined/>}
                    onChange={handleSearchChange}
                    style={{width: 200}}
                />
                <Select
                    defaultValue="contains"
                    onChange={onFilterTypeChange}
                    style={{width: 120}}
                    options={filterOptions}
                />
            </Space>
        </div>
    );
}
