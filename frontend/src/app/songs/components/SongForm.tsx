'use client'

import {Input, Switch} from 'antd';
import {forwardRef} from 'react';

import type {SongResponse} from '@/types/api';

import type {BaseFormRef} from '../../../components/forms/BaseForm';
import BaseForm from '../../../components/forms/BaseForm';


interface SongFormProps {
    initialValues?: Partial<SongResponse>;
    onFinish?: (values: Partial<SongResponse>) => void;
}

export default forwardRef<BaseFormRef, SongFormProps>(
    function SongForm({initialValues, onFinish}, ref) {
        return (
            <BaseForm ref={ref} initialValues={initialValues} onFinish={onFinish}>
                <BaseForm.Item
                    name="name"
                    label="Name"
                    rules={[{required: true, message: 'Please enter the song name'}]}
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