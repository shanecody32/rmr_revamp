'use client'

import type {SelectProps} from 'antd';
import {Select} from 'antd';
import {useEffect, useState} from 'react';
import {useDebouncedValue} from '@/hooks/useDebouncedValue';

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
    const [searchInput, setSearchInput] = useState('');
    const debouncedSearch = useDebouncedValue(searchInput, 300);

    useEffect(() => {
        if (!debouncedSearch) {
            setOptions([]);
            return;
        }

        const fetchOptions = async () => {
            setLoading(true);
            try {
                const items = await searchFn(debouncedSearch, searchParams);
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

        fetchOptions();
    }, [debouncedSearch, searchFn, searchParams, getOptionLabel, getOptionValue]);

    return (
        <Select
            {...props}
            showSearch
            value={value}
            placeholder={placeholder}
            loading={loading}
            onSearch={setSearchInput}
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
