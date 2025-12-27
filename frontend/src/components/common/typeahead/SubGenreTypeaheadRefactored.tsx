'use client'

import {searchSubGenres} from '@/lib/api/subgenres';
import type {SubGenreResponse} from '@/types/api/locations';

import {EntityTypeahead} from './EntityTypeahead';

interface SubGenreTypeaheadProps {
    value?: number;
    onChange?: (value: number | undefined, subGenre?: SubGenreResponse) => void;
    onClear?: () => void;
    genreId?: number;
    disabled?: boolean;
    placeholder?: string;
}

export default function SubGenreTypeahead({
                                              value,
                                              onChange,
                                              onClear,
                                              genreId,
                                              disabled = false,
                                              placeholder = "Select sub-genre"
                                          }: SubGenreTypeaheadProps) {
    // SubGenre endpoint doesn't have a fetchById function
    const createSubGenreEntity = (id: number, name: string): SubGenreResponse => {
        return {
            id,
            name,
            slug: '',
            chart: false,
            default: false,
            genre_id: genreId || 0,
            created_at: '',
            updated_at: ''
        };
    };

    // Create an adapter function to match the expected signature for EntityTypeahead
    const fetchSubGenres = async (search: string, params?: Record<string, any>) => {
        const genreIdParam = params?.genreId;
        return searchSubGenres(search, genreIdParam);
    };

    return (
        <EntityTypeahead<SubGenreResponse>
            value={value}
            onChange={(value, subGenre) => {
                if (value && !subGenre) {
                    // If we only have an ID (no entity), create a simple entity
                    onChange?.(value, createSubGenreEntity(value, `Sub-Genre ${value}`));
                } else {
                    onChange?.(value, subGenre);
                }
            }}
            onClear={onClear}
            disabled={disabled || !genreId}
            placeholder={placeholder}
            fetchOptions={fetchSubGenres}
            dependencies={{genreId}}
            dependenciesRequired={true}
            getOptionLabel={(subGenre) => subGenre.name}
            getOptionValue={(subGenre) => subGenre.id}
        />
    );
}
