'use client'

import type {InputProps} from 'antd';
import {Input} from 'antd';

export interface PhoneInputProps extends Omit<InputProps, 'type'> {
    format?: string;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({format = '(###) ###-####', ...props}) => {
    const formatPhoneNumber = (value: string) => {
        if (!value) return value;

        const numbers = value.replace(/[^\d]/g, '');
        let formatted = format;

        for (let i = 0; i < numbers.length && i < format.replace(/[^\d#]/g, '').length; i++) {
            formatted = formatted.replace('#', numbers[i]);
        }

        // Remove any remaining placeholders
        formatted = formatted.replace(/#/g, '');
        return formatted;
    };

    return (
        <Input
            {...props}
            onChange={(e) => {
                const formatted = formatPhoneNumber(e.target.value);
                e.target.value = formatted;
                props.onChange?.(e);
            }}
            maxLength={format.length}
        />
    );
};