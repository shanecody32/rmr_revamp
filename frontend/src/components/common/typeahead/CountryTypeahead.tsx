'use client'

import {Select, Spin} from 'antd';
import {useEffect, useState} from 'react';

import {fetchCountryById, searchCountries} from '@/lib/api/countries';
import type {CountryResponse} from '@/types/api/locations';

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
    const [loading, setLoading] = useState(false);
    const [options, setOptions] = useState<{ label: string; value: number }[]>([]);
    const [currentCountry, setCurrentCountry] = useState<CountryResponse | null>(null);

    // Load country by ID when value changes or on initial load
    useEffect(() => {
        const loadCountry = async () => {
            if (!value) {
                setCurrentCountry(null);
                setOptions([]);
                return;
            }

            // Skip if we already have this country
            if (currentCountry && currentCountry.id === value) {
                return;
            }

            setLoading(true);
            try {
                const country = await fetchCountryById(value);

                if (country) {
                    setCurrentCountry(country);

                    // Set the option in the Select component
                    setOptions([{
                        label: country.name,
                        value: country.id
                    }]);
                } else {
                    // If country not found, create a placeholder option
                    setOptions([{
                        label: `Country ID: ${value}`,
                        value
                    }]);
                }
            } catch (error) {
                console.error('Error loading country:', error);
            } finally {
                setLoading(false);
            }
        };

        loadCountry();
    }, [value, currentCountry]);

    const [defaultsLoaded, setDefaultsLoaded] = useState(false);

    const loadOptions = async (search?: string) => {
        setLoading(true);
        try {
            const countriesData = await searchCountries(search || undefined);
            setOptions(countriesData.map(country => ({
                label: country.name,
                value: country.id,
            })));
        } catch (error) {
            console.error('Error fetching countries:', error);
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
            placeholder={placeholder}
            loading={loading}
            onSearch={handleSearch}
            onOpenChange={handleOpenChange}
            onChange={(value, option) => {
                const selectedCountry = value ? {
                    id: value,
                    name: (option && typeof option === 'object' && !Array.isArray(option)) ? option.label : `Country ID: ${value}`
                } as CountryResponse : undefined;

                onChange?.(value, selectedCountry);

                if (selectedCountry) {
                    setCurrentCountry(selectedCountry);
                } else {
                    setCurrentCountry(null);
                }
            }}
            onClear={() => {
                onClear?.();
                setCurrentCountry(null);
            }}
            options={options}
            filterOption={false}
            allowClear
            disabled={disabled}
            notFoundContent={loading ? <Spin size="small"/> : null}
        />
    );
}
