'use client'

import type {RadioGroupProps} from 'antd';
import {Radio} from 'antd';

export interface RadioInputProps extends Omit<RadioGroupProps, 'options'> {
    options?: Array<{ label: string; value: string | number }>;
}

export const RadioInput: React.FC<RadioInputProps> = ({options = [], ...props}) => {
    return (
        <Radio.Group {...props}>
            {options.map(option => (
                <Radio key={option.value} value={option.value}>
                    {option.label}
                </Radio>
            ))}
        </Radio.Group>
    );
};