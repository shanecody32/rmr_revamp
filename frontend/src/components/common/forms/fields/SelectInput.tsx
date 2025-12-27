'use client'

import type {SelectProps} from 'antd';
import {Select} from 'antd';

import {BaseFormField} from '../BaseFormField';
import type {FieldConfig} from '../types';

export interface SelectInputFieldProps extends Omit<SelectProps, 'name'>, FieldConfig {
    options: Array<{ label: string; value: string | number }>;
    validator?: {
        validate: (value: any) => boolean | Promise<boolean>;
        message: string;
    };
    formatter?: {
        format: (value: any) => string;
        parse: (value: string) => any;
    };
}

export function SelectInput({
                                name,
                                label,
                                required,
                                rules,
                                validator,
                                formatter,
                                options,
                                ...props
                            }: SelectInputFieldProps) {
    return (
        <BaseFormField
            name={name}
            label={label}
            required={required}
            rules={rules}
            validator={validator}
            formatter={formatter}
        >
            <Select
                options={options}
                style={{width: '100%'}}
                {...props}
            />
        </BaseFormField>
    );
}
