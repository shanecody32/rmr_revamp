'use client'

import {Form} from 'antd';
import * as React from 'react';

import type {BaseEntity} from '@/types/api/common';

import type {BaseFormRef} from './BaseForm';
import {SwitchInput} from './fields/SwitchInput';
import {TextInput} from './fields/TextInput';


interface FormField {
    name: string;
    label: string;
    type?: 'text' | 'email' | 'number' | 'select' | 'switch' | 'url';
    required?: boolean;
    options?: Array<{ label: string; value: string | number }>;
    min?: number;
    max?: number;
}

interface EntityFormProps<T extends BaseEntity> {
    initialValues?: Partial<T>;
    onFinish?: (values: Partial<T>) => void;
    fields: FormField[];
}

const EntityForm = React.forwardRef<BaseFormRef, EntityFormProps<any>>(
    function EntityForm({initialValues, onFinish, fields}, ref) {
        const [form] = Form.useForm();

        // Expose form instance through ref
        React.useImperativeHandle(ref, () => ({
            form,
            submit: () => form.submit(),
        }), [form]);

        const renderField = React.useCallback((field: FormField) => {
            const commonProps = {
                name: field.name,
                label: field.label,
                required: field.required
            };

            switch (field.type) {
                case 'switch':
                    return (
                        <Form.Item
                            key={field.name}
                            {...commonProps}
                            valuePropName="checked"
                        >
                            <SwitchInput {...commonProps} />
                        </Form.Item>
                    );
                default:
                    return (
                        <TextInput
                            key={field.name}
                            {...commonProps}
                        />
                    );
            }
        }, []);

        return (
            <Form
                form={form}
                layout="vertical"
                initialValues={initialValues}
                onFinish={onFinish}
                validateTrigger={['onSubmit']}
            >
                {fields.map(renderField)}
            </Form>
        );
    }
);

export default EntityForm;
