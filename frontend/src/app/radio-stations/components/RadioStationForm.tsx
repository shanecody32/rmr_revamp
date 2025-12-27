'use client'

import {Input, Switch} from 'antd';
import {forwardRef} from 'react';

import type {RadioStationResponse} from '@/types/api';

import type {BaseFormRef} from '../../../components/forms/BaseForm';
import BaseForm from '../../../components/forms/BaseForm';


interface RadioStationFormProps {
    initialValues?: Partial<RadioStationResponse>;
    onFinish?: (values: Partial<RadioStationResponse>) => void;
}

export default forwardRef<BaseFormRef, RadioStationFormProps>(
    function RadioStationForm({initialValues, onFinish}, ref) {
        return (
            <BaseForm ref={ref} initialValues={initialValues} onFinish={onFinish}>
                <BaseForm.Item
                    name="name"
                    label="Name"
                    rules={[{required: true, message: 'Please enter the station name'}]}
                >
                    <Input/>
                </BaseForm.Item>
                <BaseForm.Item name="active" label="Active" valuePropName="checked">
                    <Switch/>
                </BaseForm.Item>
                <BaseForm.Item name="verified" label="Verified" valuePropName="checked">
                    <Switch/>
                </BaseForm.Item>
            </BaseForm>
        );
    }
);