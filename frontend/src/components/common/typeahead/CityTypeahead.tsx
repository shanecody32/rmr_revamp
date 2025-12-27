'use client'

import {Select, Spin} from 'antd';
import {useEffect, useState} from 'react';

import {fetchCityById, searchCities} from '@/lib/api/locations';
import type {CityResponse} from '@/types/api/locations';

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
    const [loading, setLoading] = useState(false);
    const [options, setOptions] = useState<{ label: string; value: number }[]>([]);
    const [currentCity, setCurrentCity] = useState<CityResponse | null>(null);

    // Clear city when state/country changes
    useEffect(() => {
        if (!stateId || !countryId) {
            // Clear city if state or country is cleared
            onChange?.(undefined, undefined);
            setCurrentCity(null);
            setOptions([]);
        }
    }, [countryId, stateId, onChange]);

    // Load city by ID when value changes or on initial load
    useEffect(() => {
        const loadCity = async () => {
            if (!value) {
                setCurrentCity(null);
                setOptions([]);
                return;
            }

            // Skip if we already have this city
            if (currentCity && currentCity.id === value) {
                return;
            }

            setLoading(true);
            try {
                const city = await fetchCityById(value);

                if (city) {
                    setCurrentCity(city);

                    // Set the option in the Select component
                    setOptions([{
                        label: city.name,
                        value: city.id
                    }]);
                } else {
                    // If city not found, create a placeholder option
                    setOptions([{
                        label: `City ID: ${value}`,
                        value
                    }]);
                }
            } catch (error) {
                console.error('Error loading city:', error);
            } finally {
                setLoading(false);
            }
        };

        loadCity();
    }, [value, currentCity]);

    const handleSearch = async (search: string) => {
        if (!search) {
            return;
        }

        setLoading(true);
        try {
            const citiesData = await searchCities(search, {countryId, stateId});
            setOptions(citiesData.map(city => ({
                label: city.name,
                value: city.id,
            })));
        } catch (error) {
            console.error('Error fetching cities:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Select
            showSearch
            value={value}
            placeholder={placeholder}
            loading={loading}
            onSearch={handleSearch}
            onChange={(value, option) => {
                const selectedCity = value ? {
                    id: value,
                    name: (option && typeof option === 'object' && !Array.isArray(option)) ? option.label : `City ID: ${value}`
                } as CityResponse : undefined;

                onChange?.(value, selectedCity);

                if (selectedCity) {
                    setCurrentCity(selectedCity);
                } else {
                    setCurrentCity(null);
                }
            }}
            onClear={() => {
                onClear?.();
                setCurrentCity(null);
            }}
            options={options}
            filterOption={false}
            allowClear
            disabled={disabled || !countryId || !stateId}
            notFoundContent={loading ? <Spin size="small"/> : null}
        />
    );
}
