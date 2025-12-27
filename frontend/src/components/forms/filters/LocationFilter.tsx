'use client'

import {Form} from 'antd';
import {useEffect, useRef, useState} from 'react';

import CityTypeahead from '@/components/common/typeahead/CityTypeahead';
import CountryTypeahead from '@/components/common/typeahead/CountryTypeahead';
import StateTypeahead from '@/components/common/typeahead/StateTypeahead';
import type {CityResponse, CountryResponse, StateResponse} from '@/types/api/locations';

interface LocationFilterProps {
    form: any; // Form instance from parent
}

export default function LocationFilter({form}: LocationFilterProps) {
    const [selectedCountry, setSelectedCountry] = useState<CountryResponse>();
    const [selectedState, setSelectedState] = useState<StateResponse>();
    const [selectedCity, setSelectedCity] = useState<CityResponse>();
    const mounted = useRef(true);

    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    const handleCountryChange = (value: number | undefined, country: CountryResponse | undefined) => {
        if (!mounted.current) return;

        setSelectedCountry(country);
        setSelectedState(undefined);
        setSelectedCity(undefined);

        // Clear dependent fields in form
        form.setFieldsValue({
            state_id: undefined,
            city_id: undefined
        });
    };

    const handleStateChange = (value: number | undefined, state: StateResponse | undefined) => {
        if (!mounted.current) return;

        setSelectedState(state);
        setSelectedCity(undefined);

        // Clear dependent field in form
        form.setFieldsValue({
            city_id: undefined
        });
    };

    const handleCityChange = (value: number | undefined, city: CityResponse | undefined) => {
        if (!mounted.current) return;
        setSelectedCity(city);
    };

    return (
        <>
            <Form.Item name="country_id" label="Country">
                <CountryTypeahead
                    onChange={handleCountryChange}
                    onClear={() => {
                        if (mounted.current) {
                            setSelectedCountry(undefined);
                            setSelectedState(undefined);
                            setSelectedCity(undefined);
                            form.setFieldsValue({
                                state_id: undefined,
                                city_id: undefined
                            });
                        }
                    }}
                />
            </Form.Item>

            <Form.Item name="state_id" label="State/Province">
                <StateTypeahead
                    countryId={selectedCountry?.id}
                    onChange={handleStateChange}
                    onClear={() => {
                        if (mounted.current) {
                            setSelectedState(undefined);
                            setSelectedCity(undefined);
                            form.setFieldsValue({
                                city_id: undefined
                            });
                        }
                    }}
                />
            </Form.Item>

            <Form.Item name="city_id" label="City">
                <CityTypeahead
                    countryId={selectedCountry?.id}
                    stateId={selectedState?.id}
                    onChange={handleCityChange}
                    onClear={() => {
                        if (mounted.current) {
                            setSelectedCity(undefined);
                        }
                    }}
                />
            </Form.Item>
        </>
    );
}
