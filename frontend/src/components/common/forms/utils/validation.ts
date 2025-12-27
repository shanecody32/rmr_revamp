'use client'

export const validators = {
    required: (value: any) => !!value,
    email: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    url: (value: string) => {
        try {
            new URL(value);
            return true;
        } catch {
            return false;
        }
    },
    phone: (value: string) => /^\+?[\d\s-()]+$/.test(value),
    zipCode: (value: string) => /^\d{5}(-\d{4})?$/.test(value),
    number: (value: any) => !isNaN(Number(value)),
    minLength: (length: number) => (value: string) => value.length >= length,
    maxLength: (length: number) => (value: string) => value.length <= length,
    min: (min: number) => (value: number) => value >= min,
    max: (max: number) => (value: number) => value <= max,
};

export const formatters = {
    phone: (value: string) => {
        const numbers = value.replace(/[^\d]/g, '');
        if (numbers.length === 10) {
            return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6)}`;
        }
        return value;
    },
    currency: (value: number, currency = 'USD', locale = 'en-US') => {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency
        }).format(value);
    },
    date: (value: Date, locale = 'en-US') => {
        return new Intl.DateTimeFormat(locale).format(value);
    }
};