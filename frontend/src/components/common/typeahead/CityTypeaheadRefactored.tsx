'use client'

import {fetchCityById, searchCities} from '@/lib/api/locations';
import type {CityResponse} from '@/types/api/locations';

import {EntityTypeahead} from './EntityTypeahead';

interface CityTypeaheadProps {
    value?: number;
    onChange?: (value: number | undefined, city?: CityResponse) => void;
    onClear?: () => void;
    countryId?: number;
    stateId?: number;
    disabled?: boolean;
    placeholder?: string;
}

export default function CityTypeahead({
                                          value,
                                          onChange,
                                          onClear,
                                          countryId,
                                          stateId,
                                          disabled = false,
                                          placeholder = "Select city"
                                      }: CityTypeaheadProps) {
    return (
        <EntityTypeahead<CityResponse>
            value={value}
            onChange={onChange}
            onClear={onClear}
            disabled={disabled}
            placeholder={placeholder}
            fetchOptions={searchCities}
            fetchById={fetchCityById}
            dependencies={{countryId, stateId}}
            dependenciesRequired={true}
            getOptionLabel={(city) => city.name}
            getOptionValue={(city) => city.id}
        />
    );
}
