'use client'

import {Input, Select} from 'antd';
import {useCallback, useEffect, useState} from 'react';

export interface AddressValue {
    street1: string;
    street2?: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
}

export interface AddressInputProps {
    value?: AddressValue;
    onChange?: (value: AddressValue) => void;
}

const countries = [
    {label: 'United States', value: 'US'},
    {label: 'Canada', value: 'CA'},
    {label: 'United Kingdom', value: 'GB'},
];

const usStates = [
    {label: 'Alabama', value: 'AL'},
    {label: 'Alaska', value: 'AK'},
];

export const AddressInput: React.FC<AddressInputProps> = ({value, onChange}) => {
    const [address, setAddress] = useState<AddressValue>(() => ({
        street1: '',
        street2: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'US',
        ...value
    }));

    // Only update internal state when prop value changes
    useEffect(() => {
        if (value && JSON.stringify(value) !== JSON.stringify(address)) {
            setAddress(value);
        }
    }, [value, address]);

    const handleChange = useCallback((field: keyof AddressValue, fieldValue: string) => {
        const newAddress = {...address, [field]: fieldValue};
        setAddress(newAddress);
        onChange?.(newAddress);
    }, [address, onChange]);

    return (
        <div className="space-y-4">
            <Input
                placeholder="Street Address"
                value={address.street1}
                onChange={(e) => handleChange('street1', e.target.value)}
            />

            <Input
                placeholder="Apartment, suite, etc. (optional)"
                value={address.street2}
                onChange={(e) => handleChange('street2', e.target.value)}
            />

            <div className="grid grid-cols-2 gap-4">
                <Input
                    placeholder="City"
                    value={address.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                />

                <Select
                    placeholder="State"
                    value={address.state}
                    onChange={(value) => handleChange('state', value)}
                    options={usStates}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Input
                    placeholder="ZIP Code"
                    value={address.zipCode}
                    onChange={(e) => handleChange('zipCode', e.target.value)}
                />

                <Select
                    placeholder="Country"
                    value={address.country}
                    onChange={(value) => handleChange('country', value)}
                    options={countries}
                />
            </div>
        </div>
    );
};
