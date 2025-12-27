'use client'

import {SearchOutlined} from '@ant-design/icons';
import {Input} from 'antd';

import type {NameFilterType} from '@/types/api/common';

interface TableSearchProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    filterType?: NameFilterType;
    onFilterTypeChange?: (type: NameFilterType) => void;
}

export default function TableSearch({
                                        value,
                                        onChange,
                                        placeholder = 'Search...',
                                        filterType,
                                        onFilterTypeChange
                                    }: TableSearchProps) {
    return (
        <Input
            placeholder={placeholder}
            prefix={<SearchOutlined/>}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{width: 200}}
            allowClear
        />
    );
}
