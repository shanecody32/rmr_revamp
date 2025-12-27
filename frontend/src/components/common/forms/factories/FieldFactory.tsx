'use client'

import * as React from 'react';

import {EmailInput} from '../fields/EmailInput';
import {NumberInput} from '../fields/NumberInput';
import {SelectInput} from '../fields/SelectInput';
import {SwitchInput} from '../fields/SwitchInput';
import {TextInput} from '../fields/TextInput';
import type {FieldConfig} from '../types';

type FieldComponent = React.ComponentType<any>;

export class FieldFactory {
    private static instance: FieldFactory;
    private fieldMap: Map<string, FieldComponent>;

    private constructor() {
        this.fieldMap = new Map();
        this.registerDefaultFields();
    }

    public static getInstance(): FieldFactory {
        if (!FieldFactory.instance) {
            FieldFactory.instance = new FieldFactory();
        }
        return FieldFactory.instance;
    }

    public registerField(type: string, component: FieldComponent) {
        this.fieldMap.set(type, component);
    }

    public createField(config: FieldConfig) {
        const {key, ...fieldProps} = config;
        const Component = this.fieldMap.get(config.type || 'text');

        if (!Component) {
            console.warn(`Field type "${config.type}" not registered`);
            return null;
        }

        return <Component key={key} {...fieldProps} />;
    }

    private registerDefaultFields() {
        this.fieldMap.set('text', TextInput);
        this.fieldMap.set('email', EmailInput);
        this.fieldMap.set('number', NumberInput);
        this.fieldMap.set('select', SelectInput);
        this.fieldMap.set('switch', SwitchInput);
    }
}