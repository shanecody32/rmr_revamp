'use client'

import {ClearOutlined} from '@ant-design/icons';
import {Button, Select, Space} from 'antd';

import type {FilterOption} from '@/lib/config/filterOptions';

interface TableFilterProps {
    options: FilterOption[];
    activeFilters: Record<string, boolean>;
    onChange: (filters: Record<string, boolean>) => void;
    onReset: () => void;
}

export default function TableFilter({
                                        options,
                                        activeFilters,
                                        onChange,
                                        onReset
                                    }: TableFilterProps) {
    const hasActiveFilters = Object.values(activeFilters).some(Boolean);
    const selectedValue = Object.entries(activeFilters)
        .find(([_, value]) => value === true)?.[0] || null;

    const handleStatusChange = (value: string | null) => {
        if (!value) {
            onReset();
            return;
        }

        const newFilters = Object.keys(activeFilters).reduce((acc, key) => ({
            ...acc,
            [key]: false
        }), {});

        onChange({
            ...newFilters,
            [value]: true
        });
    };

    return (
        <Space>
            <Select
                value={selectedValue || ''}
                onChange={handleStatusChange}
                style={{width: 240}}
                placeholder="Filter by status"
                optionLabelProp="label"
                listHeight={320}
                popupMatchSelectWidth={false}
                styles={{
                    popup: {
                        root: {
                            minWidth: '280px',
                            padding: '4px 0'
                        }
                    }
                }}
            >
                <Select.Option value="" label="All Statuses">
                    <div className="px-2 py-1">All Statuses</div>
                </Select.Option>
                {options.map(option => (
                    <Select.Option
                        key={option.key}
                        value={option.key}
                        label={option.label}
                    >
                        <div className="px-2 py-2">
                            <div className="font-medium">{option.label}</div>
                            {option.description && (
                                <div className="text-gray-500 text-sm mt-0.5 whitespace-normal">
                                    {option.description}
                                </div>
                            )}
                        </div>
                    </Select.Option>
                ))}
            </Select>
            {hasActiveFilters && (
                <Button
                    icon={<ClearOutlined/>}
                    onClick={onReset}
                >
                    Clear
                </Button>
            )}
        </Space>
    );
}
