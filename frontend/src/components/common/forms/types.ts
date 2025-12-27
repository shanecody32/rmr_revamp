'use client'

import type {Rule} from 'antd/es/form';

// Base interface for all form field props
export interface BaseFieldProps {
    value?: any;
    onChange?: (value: any) => void;
    disabled?: boolean;
    className?: string;
}

// Common configuration interface
export interface FieldConfig {
    key?: string;
    name: string;
    label: string;
    type?: string;
    rules?: Rule[];
    required?: boolean;
    disabled?: boolean;
    config?: Record<string, any>;
    initialValue?: any;
}

// Field validation interface
export interface FieldValidator<T = any> {
    validate: (value: T) => boolean | Promise<boolean>;
    message: string;
}

// Field formatter interface
export interface FieldFormatter<T = any> {
    format: (value: T) => string;
    parse: (value: string) => T;
}