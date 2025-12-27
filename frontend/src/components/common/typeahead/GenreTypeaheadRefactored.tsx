'use client'

import {searchGenres} from '@/lib/api/genres';
import type {GenreResponse} from '@/types/api/locations';

import {EntityTypeahead} from './EntityTypeahead';

interface GenreTypeaheadProps {
    value?: number;
    onChange?: (value: number | undefined, genre?: GenreResponse) => void;
    onClear?: () => void;
    disabled?: boolean;
    placeholder?: string;
}

export default function GenreTypeahead({
                                           value,
                                           onChange,
                                           onClear,
                                           disabled = false,
                                           placeholder = "Select genre"
                                       }: GenreTypeaheadProps) {
    // Genre endpoint doesn't have a fetchById function, so we'll create a simple entity
    // when a value is selected but we don't have the full entity data
    const createGenreEntity = (id: number, name: string): GenreResponse => {
        return {
            id,
            name,
            slug: '',
            chart: false,
            created_at: '',
            updated_at: ''
        };
    };

    return (
        <EntityTypeahead<GenreResponse>
            value={value}
            onChange={(value, genre) => {
                if (value && !genre) {
                    // If we only have an ID (no entity), create a simple entity
                    onChange?.(value, createGenreEntity(value, `Genre ${value}`));
                } else {
                    onChange?.(value, genre);
                }
            }}
            onClear={onClear}
            disabled={disabled}
            placeholder={placeholder}
            fetchOptions={searchGenres}
            getOptionLabel={(genre) => genre.name}
            getOptionValue={(genre) => genre.id}
        />
    );
}