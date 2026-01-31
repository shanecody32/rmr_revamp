'use client'

import {Select} from 'antd';
import {useState} from 'react';

import {searchGenres} from '@/lib/api/genres';
import type {GenreResponse} from '@/types/api/locations';

interface GenreTypeaheadProps {
    value?: number;
    onChange?: (value: number | undefined, genre?: GenreResponse) => void;
    onClear?: () => void;
}

export default function GenreTypeahead({
                                           value,
                                           onChange,
                                           onClear
                                       }: GenreTypeaheadProps) {
    const [loading, setLoading] = useState(false);
    const [options, setOptions] = useState<{ label: string; value: number }[]>([]);
    const [defaultsLoaded, setDefaultsLoaded] = useState(false);

    const loadOptions = async (search?: string) => {
        setLoading(true);
        try {
            const genres = await searchGenres(search || undefined);
            setOptions(genres.map(genre => ({
                label: genre.name,
                value: genre.id,
            })));
        } catch (error) {
            console.error('Error fetching genres:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (search: string) => {
        await loadOptions(search);
    };

    const handleOpenChange = (open: boolean) => {
        if (open && !defaultsLoaded) {
            setDefaultsLoaded(true);
            loadOptions();
        }
    };

    return (
        <Select
            showSearch
            value={value}
            placeholder="Select genre"
            loading={loading}
            onSearch={handleSearch}
            onOpenChange={handleOpenChange}
            onChange={(value, option) => {
                onChange?.(value, (option && typeof option === 'object' && !Array.isArray(option)) ?
                    {id: value, name: option.label} as GenreResponse : undefined);
            }}
            onClear={onClear}
            options={options}
            filterOption={false}
            allowClear
        />
    );
}
