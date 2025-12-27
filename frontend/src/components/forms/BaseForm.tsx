'use client'

import {Form} from 'antd';
import type {FormInstance} from 'antd/es/form';
import {forwardRef, ReactNode, useImperativeHandle} from 'react';

interface BaseFormProps {
    children: ReactNode;
    initialValues?: Record<string, any>;
    onFinish?: (values: any) => void;
}

export interface BaseFormRef {
    form: FormInstance;
    submit: () => void;
}

const BaseFormComponent = forwardRef<BaseFormRef, BaseFormProps>(
    ({children, initialValues, onFinish}, ref) => {
        const [form] = Form.useForm();

        useImperativeHandle(ref, () => ({
            form,
            submit: () => form.submit(),
        }));

        return (
            <Form
                form={form}
                layout="vertical"
                initialValues={initialValues}
                onFinish={onFinish}
            >
                {children}
            </Form>
        );
    }
);

BaseFormComponent.displayName = 'BaseFormComponent';

const BaseForm = Object.assign(BaseFormComponent, {
    Item: Form.Item,
});

export default BaseForm;
