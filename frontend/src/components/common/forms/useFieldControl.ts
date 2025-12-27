'use client'

import {Form} from 'antd';
import * as React from 'react';

import type {FieldFormatter, FieldValidator} from './types';

interface UseFieldControlParams {
    name: string;
    validator?: FieldValidator;
    formatter?: FieldFormatter;
}

export function useFieldControl({
                                    name,
                                    validator,
                                    formatter,
                                }: UseFieldControlParams) {
    const form = Form.useFormInstance();
    const [error, setError] = React.useState<string | null>(null);

    // Handle validation
    React.useEffect(() => {
        if (validator) {
            // Custom validation without using rules in setFields
            const validateField = async () => {
                try {
                    const value = form.getFieldValue(name);
                    const isValid = await validator.validate(value);
                    if (!isValid) {
                        setError(validator.message);
                        form.setFields([{
                            name,
                            errors: [validator.message]
                        }]);
                    } else {
                        setError(null);
                        form.setFields([{
                            name,
                            errors: []
                        }]);
                    }
                } catch (err) {
                    const errorMessage = (err as Error).message;
                    setError(errorMessage);
                    form.setFields([{
                        name,
                        errors: [errorMessage]
                    }]);
                }
            };

            // Initial validation
            validateField();

            // Subscribe to field value changes
            const unsubscribe = form.getFieldInstance(name)?.addEventListener('change', validateField);

            return () => {
                if (unsubscribe) unsubscribe();
            };
        }
    }, [form, name, validator]);

    // Handle formatting
    React.useEffect(() => {
        if (formatter) {
            const value = form.getFieldValue(name);
            if (value !== undefined) {
                const formatted = formatter.format(value);
                form.setFieldValue(name, formatted);
            }
        }
    }, [form, name, formatter]);

    return {
        error,
        setError,
    };
}
