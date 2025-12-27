'use client'

import {Form} from 'antd';
import type {Rule} from 'antd/es/form';
import * as React from 'react';

import type {FieldConfig} from './types';

interface BaseFormFieldProps extends Omit<FieldConfig, 'type'> {
    children: React.ReactNode;
    rules?: Rule[];
    required?: boolean;
    validator?: {
        validate: (value: any) => boolean | Promise<boolean>;
        message: string;
    };
    formatter?: {
        format: (value: any) => string;
        parse: (value: string) => any;
    };
}

export function BaseFormField({
                                  name,
                                  label,
                                  rules = [],
                                  required,
                                  validator,
                                  formatter,
                                  children
                              }: BaseFormFieldProps) {
    const form = Form.useFormInstance();
    const [error, setError] = React.useState<string | null>(null);
    const prevValueRef = React.useRef<any>(undefined);
    const isMountedRef = React.useRef<boolean>(false);

    // Set mounted ref on mount and cleanup on unmount
    React.useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // Register validator and formatter if provided
    React.useEffect(() => {
        // Only proceed if component is mounted and form and name are valid
        if (!isMountedRef.current || !form || !name || !validator) return;

        // Custom validation logic without using rules in setFields
        const validateField = async () => {
            try {
                // Double-check that component is still mounted and form and name are valid
                if (!isMountedRef.current || !form || !name) return;

                const value = form.getFieldValue(name);
                const isValid = await validator.validate(value);

                // Check again before updating state
                if (!isMountedRef.current) return;

                if (!isValid) {
                    setError(validator.message);
                } else {
                    setError(null);
                }
            } catch (err) {
                if (isMountedRef.current) {
                    setError((err as Error).message);
                }
            }
        };

        // Initialize the ref with the current value
        // Wrap in a setTimeout to ensure form is connected
        setTimeout(() => {
            if (isMountedRef.current && form && name) {
                prevValueRef.current = form.getFieldValue(name);
                validateField();
            }
        }, 0);

        // Set up a timer to periodically check for changes
        const intervalId = setInterval(() => {
            // Check if component is still mounted and form and name are valid
            if (!isMountedRef.current || !form || !name) return;

            const currentValue = form.getFieldValue(name);
            if (JSON.stringify(currentValue) !== JSON.stringify(prevValueRef.current)) {
                prevValueRef.current = currentValue;
                validateField();
            }
        }, 500); // Check every 500ms

        return () => {
            clearInterval(intervalId);
        };
    }, [form, name, validator]);

    const fieldRules = React.useMemo(() => [
        ...(required ? [{required: true, message: `Please enter ${label.toLowerCase()}`}] : []),
        ...rules
    ], [required, label, rules]);

    return (
        <Form.Item
            name={name}
            label={label}
            rules={fieldRules}
            validateStatus={error ? 'error' : undefined}
            help={error}
            validateTrigger={['onSubmit']}
        >
            {children}
        </Form.Item>
    );
}
