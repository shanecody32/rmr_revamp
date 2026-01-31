'use client'

import {Select, Spin} from 'antd';
import {useEffect, useState} from 'react';

import {fetchStateById, searchStates} from '@/lib/api/states';
import type {StateResponse} from '@/types/api/locations';

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
    const [loading, setLoading] = useState(false);
    const [options, setOptions] = useState<{ label: string; value: number }[]>([]);
    const [currentState, setCurrentState] = useState<StateResponse | null>(null);

    // Clear state when country changes
    useEffect(() => {
        if (!countryId) {
            // Clear state if country is cleared
            onChange?.(undefined, undefined);
            setCurrentState(null);
            setOptions([]);
        }
    }, [countryId, onChange]);

    // Load state by ID when value changes or on initial load
    useEffect(() => {
        const loadState = async () => {
            if (!value) {
                setCurrentState(null);
                setOptions([]);
                return;
            }

            // Skip if we already have this state
            if (currentState && currentState.id === value) {
                return;
            }

            setLoading(true);
            try {
                const state = await fetchStateById(value);

                if (state) {
                    setCurrentState(state);

                    // Set the option in the Select component
                    setOptions([{
                        label: state.name,
                        value: state.id
                    }]);
                } else {
                    // If state not found, create a placeholder option
                    setOptions([{
                        label: `State ID: ${value}`,
                        value
                    }]);
                }
            } catch (error) {
                console.error('Error loading state:', error);
            } finally {
                setLoading(false);
            }
        };

        loadState();
    }, [value, currentState]);

    const loadOptions = async (search?: string) => {
        setLoading(true);
        try {
            const statesData = await searchStates(search || undefined, countryId);
            setOptions(statesData.map(state => ({
                label: state.name,
                value: state.id,
            })));
        } catch (error) {
            console.error('Error fetching states:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (search: string) => {
        await loadOptions(search);
    };

    const handleOpenChange = (open: boolean) => {
        if (open) {
            loadOptions();
        }
    };

    return (
        <Select
            showSearch
            value={value}
            placeholder={placeholder}
            loading={loading}
            onSearch={handleSearch}
            onOpenChange={handleOpenChange}
            onChange={(value, option) => {
                const selectedState = value ? {
                    id: value,
                    name: (option && typeof option === 'object' && !Array.isArray(option)) ? option.label : `State ID: ${value}`
                } as StateResponse : undefined;

                onChange?.(value, selectedState);

                if (selectedState) {
                    setCurrentState(selectedState);
                } else {
                    setCurrentState(null);
                }
            }}
            onClear={() => {
                onClear?.();
                setCurrentState(null);
            }}
            options={options}
            filterOption={false}
            allowClear
            disabled={disabled || !countryId}
            notFoundContent={loading ? <Spin size="small"/> : null}
        />
    );
}
