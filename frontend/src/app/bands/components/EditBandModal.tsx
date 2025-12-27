'use client'

import {useEffect, useRef} from 'react';

import EntityModal from '@/components/common/modals/EntityModal';
import type {BaseFormRef} from '@/components/forms/BaseForm';
import {api} from '@/lib/api/config';
import type {BandResponse} from '@/types/api/bands';

const bandFields: Array<{
    name: string;
    label: string;
    type?: 'text' | 'url' | 'switch';
    required?: boolean;
}> = [
    {
        name: 'name',
        label: 'Name',
        required: true
    },
    {
        name: 'website',
        label: 'Website',
        type: 'url'
    },
    {
        name: 'email',
        label: 'Email',
        type: 'text'
    },
    {
        name: 'verified',
        label: 'Verified',
        type: 'switch'
    },
    {
        name: 'approved',
        label: 'Approved',
        type: 'switch'
    }
];

interface EditBandModalProps {
    open: boolean;
    onCancel: () => void;
    onSuccess: (band: BandResponse) => void;
    band: BandResponse | null;
}

export default function EditBandModal({
                                          open,
                                          onCancel,
                                          onSuccess,
                                          band
                                      }: EditBandModalProps) {
    const formRef = useRef<BaseFormRef>(null);

    // Reset form and set initial values when band changes
    useEffect(() => {
        if (formRef.current?.form && band) {
            formRef.current.form.setFieldsValue(band);
        }
    }, [band]);

    const handleSubmit = async (data: Partial<BandResponse>): Promise<BandResponse> => {
        if (!band) {
            throw new Error('Band not found');
        }

        const response = await api.put<BandResponse>(`/bands/${band.id}`, data);
        return response.data;
    };

    return (
        <EntityModal<BandResponse>
            title="Edit Band"
            open={open}
            onCancel={onCancel}
            onSuccess={onSuccess}
            fields={bandFields}
            onSubmit={handleSubmit}
            initialValues={band || undefined}
            successMessage="Band updated successfully"
        />
    );
}
