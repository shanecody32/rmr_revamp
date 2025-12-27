'use client'

import type {FormInstance} from 'antd/es/form';
import * as React from 'react';

interface FormContextValue {
    form: FormInstance;
}

const FormContext = React.createContext<FormContextValue | null>(null);

interface FormProviderProps {
    form: FormInstance;
    children: React.ReactNode;
}

export function FormProvider({form, children}: FormProviderProps) {
    const value = React.useMemo(() => ({form}), [form]);

    return (
        <FormContext.Provider value={value}>
            {children}
        </FormContext.Provider>
    );
}

export function useFormContext() {
    const context = React.useContext(FormContext);
    if (!context) {
        throw new Error('useFormContext must be used within a FormProvider');
    }
    return context;
}