'use client'

import type {SwitchProps} from 'antd';
import {Switch} from 'antd';
import * as React from 'react';

import type {FieldConfig} from '../types';

export interface SwitchInputFieldProps extends Omit<SwitchProps, 'name'>, Omit<FieldConfig, 'type' | 'key'> {
    validator?: {
        validate: (value: any) => boolean | Promise<boolean>;
        message: string;
    };
    formatter?: {
        format: (value: any) => string;
        parse: (value: string) => any;
    };
}

export function SwitchInput({
                                name,
                                label,
                                required,
                                rules,
                                validator,
                                formatter,
                                ...props
                            }: SwitchInputFieldProps) {
    return <Switch {...props} />;
}
