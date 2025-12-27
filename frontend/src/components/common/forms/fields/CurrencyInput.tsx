'use client'

import type {InputNumberProps} from 'antd';
import {InputNumber} from 'antd';

export interface CurrencyInputProps extends Omit<InputNumberProps, 'prefix'> {
    currency?: string;
    locale?: string;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
                                                                currency = 'USD',
                                                                locale = 'en-US',
                                                                ...props
                                                            }) => {
    const formatter = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    return (
        <InputNumber
            style={{width: '100%'}}
            formatter={(value) => {
                if (value === null || value === undefined) return '';
                // Ensure value is a number before passing to formatter.format()
                const numValue = typeof value === 'string' ? parseFloat(value) : value;
                return formatter.format(numValue).replace(/[A-Z]{3}/, '').trim();
            }}
            parser={(value) => {
                if (!value) return '';
                const parsed = value.replace(/[^\d.-]/g, '');
                return parsed ? Number(parsed) : 0;
            }}
            prefix={currency}
            {...props}
        />
    );
};
