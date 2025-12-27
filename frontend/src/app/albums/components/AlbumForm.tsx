'use client'

import {Input, Switch} from 'antd';
import {forwardRef} from 'react';

import type {AlbumResponse} from '@/types/api';

import type {BaseFormRef} from '../../../components/forms/BaseForm';
import BaseForm from '../../../components/forms/BaseForm';


interface AlbumFormProps {
    initialValues?: Partial<AlbumResponse>;
    onFinish?: (values: Partial<AlbumResponse>) => void;
}

export default forwardRef<BaseFormRef, AlbumFormProps>(
    function AlbumForm({initialValues, onFinish}, ref) {
        return (
            <BaseForm ref={ref} initialValues={initialValues} onFinish={onFinish}>
                <BaseForm.Item
                    name="name"
                    label="Name"
                    rules={[{required: true, message: 'Please enter the album name'}]}
                >
                    <Input/>
                </BaseForm.Item>
                <BaseForm.Item name="verified" label="Verified" valuePropName="checked">
                    <Switch/>
                </BaseForm.Item>
            </BaseForm>
        );
    }
);