'use client'

import type {InputProps} from 'antd';
import {Input} from 'antd';
import * as React from 'react';

import {BaseFormField} from '../BaseFormField';
import type {FieldConfig} from '../types';

export interface TextInputFieldProps extends Omit<InputProps, 'name'>, Omit<FieldConfig, 'type' | 'key'> {
    validator?: {
        validate: (value: any) => boolean | Promise<boolean>;
        message: string;
    };
    formatter?: {
        format: (value: any) => string;
        parse: (value: string) => any;
    };
}

export function TextInput({
                              name,
                              label,
                              required,
                              rules,
                              validator,
                              formatter,
                              ...props
                          }: TextInputFieldProps) {
    return (
        <BaseFormField
            name={name}
            label={label}
            required={required}
            rules={rules}
            validator={validator}
            formatter={formatter}
        >
            <Input {...props} />
        </BaseFormField>
    );
}
