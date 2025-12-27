'use client'

import {fetchStateById, searchStates} from '@/lib/api/states';
import type {StateResponse} from '@/types/api/locations';

import {EntityTypeahead} from './EntityTypeahead';

interface StateTypeaheadProps {
    value?: number;
    onChange?: (value: number | undefined, state?: StateResponse) => void;
    onClear?: () => void;
    countryId?: number;
    disabled?: boolean;
    placeholder?: string;
}

export default function StateTypeahead({
                                           value,
                                           onChange,
                                           onClear,
                                           countryId,
                                           disabled = false,
                                           placeholder = "Select state/province"
                                       }: StateTypeaheadProps) {
    // Create an adapter function to match the expected type signature
    const fetchStatesAdapter = async (search: string, params?: Record<string, any>) => {
        return searchStates(search, params?.countryId);
    };

    return (
        <EntityTypeahead<StateResponse>
            value={value}
            onChange={onChange}
            onClear={onClear}
            disabled={disabled}
            placeholder={placeholder}
            fetchOptions={fetchStatesAdapter}
            fetchById={fetchStateById}
            dependencies={{countryId}}
            dependenciesRequired={true}
            getOptionLabel={(state) => state.name}
            getOptionValue={(state) => state.id}
        />
    );
}
