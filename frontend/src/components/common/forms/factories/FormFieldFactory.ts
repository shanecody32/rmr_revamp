'use client'

import type {Rule} from 'antd/es/form';
import type {ReactNode} from 'react';

export interface FieldConfig {
    name: string;
    label: string;
    type: string;
    rules?: Rule[];
    required?: boolean;
    disabled?: boolean;
    config?: Record<string, any>;
}

export interface FieldComponent {
    render: (config: FieldConfig) => ReactNode;
}

export class FormFieldFactory {
    private static instance: FormFieldFactory;
    private fields: Map<string, FieldComponent>;

    private constructor() {
        this.fields = new Map();
    }

    static getInstance(): FormFieldFactory {
        if (!FormFieldFactory.instance) {
            FormFieldFactory.instance = new FormFieldFactory();
        }
        return FormFieldFactory.instance;
    }

    registerField(type: string, component: FieldComponent): void {
        this.fields.set(type, component);
    }

    createField(config: FieldConfig): ReactNode {
        const component = this.fields.get(config.type);
        if (!component) {
            throw new Error(`Field type "${config.type}" not registered`);
        }
        return component.render(config);
    }
}