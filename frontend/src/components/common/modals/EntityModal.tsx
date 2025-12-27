'use client'

import {useEffect, useRef} from 'react';

import type {BaseFormRef} from '@/components/forms/BaseForm';
import AddModal from '@/components/modals/AddModal';
import {useFormSubmit} from '@/hooks/useFormSubmit';
import type {BaseEntity} from '@/types/api/common';

import EntityForm from '../forms/EntityForm';

interface EntityModalProps<T extends BaseEntity> {
    open: boolean;
    onCancel: () => void;
    onSuccess: (entity: T) => void;
    title: string;
    fields: Array<{
        name: string;
        label: string;
        type?: 'text' | 'url' | 'switch';
        required?: boolean;
    }>;
    onSubmit: (data: Partial<T>) => Promise<T>;
    initialValues?: Partial<T>;
    successMessage?: string;
    skipSuccessMessage?: boolean;
}

export default function EntityModal<T extends BaseEntity>({
                                                              open,
                                                              onCancel,
                                                              onSuccess,
                                                              title,
                                                              fields,
                                                              onSubmit,
                                                              initialValues,
                                                              successMessage,
                                                              skipSuccessMessage = false
                                                          }: EntityModalProps<T>) {
    const formRef = useRef<BaseFormRef>(null);

    // Reset form when modal closes
    useEffect(() => {
        if (!open && formRef.current?.form) {
            formRef.current.form.resetFields();
        }
    }, [open]);

    const {loading, handleSubmit} = useFormSubmit<Partial<T>>({
        onSubmit: async (data) => {
            const result = await onSubmit(data);
            if (result) {
                onSuccess(result);
                // Only reset if form ref exists
                if (formRef.current?.form) {
                    formRef.current.form.resetFields();
                }
            }
            return result;
        },
        successMessage: successMessage || 'Successfully created',
        skipSuccessMessage
    });

    const handleCancel = () => {
        // Only reset if form ref exists
        if (formRef.current?.form) {
            formRef.current.form.resetFields();
        }
        onCancel();
    };

    const handleAdd = () => {
        formRef.current?.submit();
    };

    return (
        <AddModal
            title={title}
            open={open}
            onCancel={handleCancel}
            onOk={handleAdd}
            confirmLoading={loading}
        >
            <EntityForm
                ref={formRef}
                onFinish={handleSubmit}
                fields={fields}
                initialValues={initialValues}
            />
        </AddModal>
    );
}
