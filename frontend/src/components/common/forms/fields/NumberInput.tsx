'use client'

import type {InputNumberProps} from 'antd';
import {InputNumber} from 'antd';

import {BaseFormField} from '../BaseFormField';
import type {FieldConfig, FieldFormatter, FieldValidator} from '../types';
import {validators} from '../utils/validation';

export interface NumberInputFieldProps extends Omit<InputNumberProps, 'name' | 'type' | 'formatter'>, FieldConfig {
    min?: number;
    max?: number;
    validator?: FieldValidator;
    customFormatter?: FieldFormatter;
}

export function NumberInput({
                                name,
                                label,
                                required,
                                rules,
                                validator,
                                customFormatter,
                                min,
                                max,
                                ...props
                            }: NumberInputFieldProps) {
    const numberValidator = {
        validate: (value: any) => {
            if (!validators.number(value)) return false;
            if (min !== undefined && value < min) return false;
            if (max !== undefined && value > max) return false;
            return true;
        },
        message: `Please enter a valid number${min !== undefined ? ` (min: ${min})` : ''}${max !== undefined ? ` (max: ${max})` : ''}`
    };

    return (
        <BaseFormField
            name={name}
            label={label}
            required={required}
            rules={rules}
            validator={validator || numberValidator}
            formatter={customFormatter}
        >
            <InputNumber
                style={{width: '100%'}}
                min={min}
                max={max}
                {...props}
            />
        </BaseFormField>
    );
}
