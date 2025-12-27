'use client'

import {Input} from 'antd';
import {forwardRef} from 'react';

import type {BandResponse} from '@/types/api';

import type {BaseFormRef} from '../../../components/forms/BaseForm';
import BaseForm from '../../../components/forms/BaseForm';


interface BandFormProps {
    initialValues?: Partial<BandResponse>;
    onFinish?: (values: Partial<BandResponse>) => void;
}

export default forwardRef<BaseFormRef, BandFormProps>(
    function BandForm({initialValues, onFinish}, ref) {
        return (
            <BaseForm ref={ref} initialValues={initialValues} onFinish={onFinish}>
                <BaseForm.Item
                    name="name"
                    label="Name"
                    rules={[{required: true, message: 'Please enter the band name'}]}
                >
                    <Input/>
                </BaseForm.Item>
            </BaseForm>
        );
    }
);