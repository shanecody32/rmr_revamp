'use client'

import {Form} from 'antd';
import * as React from 'react';

import {FieldFactory} from './factories/FieldFactory';
import type {FieldConfig} from './types';

export default function FormField({
                                      name,
                                      label,
                                      type = 'text',
                                      rules = [],
                                      required = false,
                                      disabled = false,
                                      config = {},
                                      initialValue
                                  }: FieldConfig) {
    const fieldRules = [
        ...(required ? [{required: true, message: `Please enter ${label.toLowerCase()}`}] : []),
        ...rules
    ];

    const factory = FieldFactory.getInstance();

    // Create field props without key
    const fieldProps = {
        name,
        label,
        type,
        rules: fieldRules,
        required,
        disabled,
        ...config,
        initialValue
    };

    const field = factory.createField(fieldProps);

    if (!field) {
        return null;
    }

    return (
        <Form.Item
            name={name}
            label={label}
            rules={fieldRules}
            valuePropName={type === 'checkbox' ? 'checked' : 'value'}
            initialValue={initialValue}
        >
            {field}
        </Form.Item>
    );
}
