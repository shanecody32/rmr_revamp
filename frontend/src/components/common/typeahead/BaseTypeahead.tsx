'use client'

import type {SelectProps} from 'antd';
import {Select} from 'antd';
import {useState} from 'react';

export interface BaseTypeaheadProps<T> extends Omit<SelectProps, 'onChange'> {
    value?: number;
    onChange?: (value: number | undefined, item?: T) => void;
    onClear?: () => void;
    searchFn: (search: string, params?: Record<string, any>) => Promise<T[]>;
    searchParams?: Record<string, any>;
    getOptionLabel: (item: T) => string;
    getOptionValue: (item: T) => number;
    disabled?: boolean;
    placeholder?: string;
}

export function BaseTypeahead<T>({
                                     value,
                                     onChange,
                                     onClear,
                                     searchFn,
                                     searchParams = {},
                                     getOptionLabel,
                                     getOptionValue,
                                     disabled = false,
                                     placeholder,
                                     ...props
                                 }: BaseTypeaheadProps<T>) {
    const [loading, setLoading] = useState(false);
    const [options, setOptions] = useState<{ label: string; value: number }[]>([]);

    const handleSearch = async (search: string) => {
        if (!search) {
            setOptions([]);
            return;
        }

        setLoading(true);
        try {
            const items = await searchFn(search, searchParams);
            setOptions(items.map(item => ({
                label: getOptionLabel(item),
                value: getOptionValue(item),
            })));
        } catch (error) {
            console.error('Error fetching options:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Select
            {...props}
            showSearch
            value={value}
            placeholder={placeholder}
            loading={loading}
            onSearch={handleSearch}
            onChange={(value, option) => {
                if (option && !Array.isArray(option)) {
                    onChange?.(value, {id: value, name: option.label} as unknown as T);
                } else {
                    onChange?.(value, undefined);
                }
            }}
            onClear={onClear}
            options={options}
            filterOption={false}
            allowClear
            disabled={disabled}
        />
    );
}
