'use client'

import {fetchCountryById, searchCountries} from '@/lib/api/countries';
import type {CountryResponse} from '@/types/api/locations';

import {EntityTypeahead} from './EntityTypeahead';

interface CountryTypeaheadProps {
    value?: number;
    onChange?: (value: number | undefined, country?: CountryResponse) => void;
    onClear?: () => void;
    disabled?: boolean;
    placeholder?: string;
}

export default function CountryTypeahead({
                                             value,
                                             onChange,
                                             onClear,
                                             disabled = false,
                                             placeholder = "Select country"
                                         }: CountryTypeaheadProps) {
    return (
        <EntityTypeahead<CountryResponse>
            value={value}
            onChange={onChange}
            onClear={onClear}
            disabled={disabled}
            placeholder={placeholder}
            fetchOptions={searchCountries}
            fetchById={fetchCountryById}
            getOptionLabel={(country) => country.name}
            getOptionValue={(country) => country.id}
        />
    );
}
