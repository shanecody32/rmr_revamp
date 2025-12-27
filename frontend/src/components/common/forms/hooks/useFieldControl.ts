'use client'

import {useCallback, useEffect, useState} from 'react';

interface UseFieldControlParams<T> {
    value?: T;
    onChange?: (value: T) => void;
    validate?: (value: T) => boolean | Promise<boolean>;
    format?: (value: T) => string;
    parse?: (value: string) => T;
}

export function useFieldControl<T>({
                                       value,
                                       onChange,
                                       validate,
                                       format,
                                       parse
                                   }: UseFieldControlParams<T>) {
    const [internalValue, setInternalValue] = useState<T | undefined>(value);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (JSON.stringify(value) !== JSON.stringify(internalValue)) {
            setInternalValue(value);
        }
    }, [value, internalValue]);

    const handleChange = useCallback(async (newValue: T) => {
        setInternalValue(newValue);

        if (validate) {
            try {
                const isValid = await validate(newValue);
                if (!isValid) {
                    setError('Invalid value');
                    return;
                }
                setError(null);
            } catch (err) {
                setError('Validation error');
                return;
            }
        }

        if (format && parse) {
            const formatted = format(newValue);
            const parsed = parse(formatted);
            onChange?.(parsed);
        } else {
            onChange?.(newValue);
        }
    }, [onChange, validate, format, parse]);

    return {
        value: internalValue,
        error,
        handleChange
    };
}
