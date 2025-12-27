'use client'

import type {SelectProps} from 'antd';
import {Select, Spin} from 'antd';
import {useEffect, useRef, useState} from 'react';

import {useDebouncedValue} from '@/hooks/useDebouncedValue';

export interface TypeaheadInputProps extends Omit<SelectProps, 'options'> {
    fetchOptions: (search: string) => Promise<Array<{ label: string; value: string | number }>>;
    debounceMs?: number;
    minSearchLength?: number;
}

export const TypeaheadInput: React.FC<TypeaheadInputProps> = ({
                                                                  fetchOptions,
                                                                  debounceMs = 300,
                                                                  minSearchLength = 2,
                                                                  ...props
                                                              }) => {
    const [loading, setLoading] = useState(false);
    const [options, setOptions] = useState<Array<{ label: string; value: string | number }>>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const mounted = useRef(true);
    const debouncedSearch = useDebouncedValue(searchTerm, debounceMs);

    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    useEffect(() => {
        const loadOptions = async () => {
            if (debouncedSearch.length < minSearchLength) {
                setOptions([]);
                return;
            }

            setLoading(true);
            try {
                const results = await fetchOptions(debouncedSearch);
                if (mounted.current) {
                    setOptions(results);
                }
            } catch (error) {
                console.error('Error fetching options:', error);
            } finally {
                if (mounted.current) {
                    setLoading(false);
                }
            }
        };

        loadOptions();
    }, [debouncedSearch, fetchOptions, minSearchLength]);

    return (
        <Select
            showSearch
            filterOption={false}
            onSearch={setSearchTerm}
            loading={loading}
            options={options}
            notFoundContent={loading ? <Spin size="small"/> : null}
            {...props}
        />
    );
};