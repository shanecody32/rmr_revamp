'use client'

import type {InputProps} from 'antd';
import {Input} from 'antd';

import {BaseFormField} from '../BaseFormField';
import type {FieldConfig, FieldFormatter, FieldValidator} from '../types';
import {validators} from '../utils/validation';

export interface EmailInputFieldProps extends Omit<InputProps, 'name' | 'type'>, FieldConfig {
    validator?: FieldValidator;
    formatter?: FieldFormatter;
}

const emailValidator = {
    validate: (value: string) => {
        // Allow empty values (makes the field optional)
        if (!value) return true;
        // Validate non-empty values as emails
        return validators.email(value);
    },
    message: 'Please enter a valid email address'
};

export function EmailInput({
                               name,
                               label,
                               required,
                               rules,
                               validator = emailValidator,
                               formatter,
                               ...props
                           }: EmailInputFieldProps) {
    return (
        <BaseFormField
            name={name}
            label={label}
            required={required}
            rules={rules}
            validator={validator}
            formatter={formatter}
        >
            <Input type="email" {...props} />
        </BaseFormField>
    );
}
