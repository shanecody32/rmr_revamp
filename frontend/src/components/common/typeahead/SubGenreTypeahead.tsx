'use client'

import {Select} from 'antd';
import {useState} from 'react';

import {searchSubGenres} from '@/lib/api/subgenres';
import type {SubGenreResponse} from '@/types/api/locations';

interface SubGenreTypeaheadProps {
    value?: number;
    onChange?: (value: number | undefined, subGenre?: SubGenreResponse) => void;
    onClear?: () => void;
    genreId?: number;
}

export default function SubGenreTypeahead({
                                              value,
                                              onChange,
                                              onClear,
                                              genreId
                                          }: SubGenreTypeaheadProps) {
    const [loading, setLoading] = useState(false);
    const [options, setOptions] = useState<{ label: string; value: number }[]>([]);

    const handleSearch = async (search: string) => {
        if (!search) {
            setOptions([]);
            return;
        }

        setLoading(true);
        try {
            const subGenres = await searchSubGenres(search, genreId);
            setOptions(subGenres.map(subGenre => ({
                label: subGenre.name,
                value: subGenre.id,
            })));
        } catch (error) {
            console.error('Error fetching sub-genres:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Select
            showSearch
            value={value}
            placeholder="Select sub-genre"
            loading={loading}
            onSearch={handleSearch}
            onChange={(value, option) => {
                // Handle both single option and array of options
                const selectedOption = Array.isArray(option) ? option[0] : option;
                onChange?.(value, selectedOption ? {
                    id: value,
                    name: selectedOption.label
                } as SubGenreResponse : undefined);
            }}
            onClear={onClear}
            options={options}
            filterOption={false}
            allowClear
            disabled={!genreId}
        />
    );
}
