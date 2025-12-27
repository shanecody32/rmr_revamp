'use client'

import EntityModal from '@/components/common/modals/EntityModal';
import {createRadioStation} from '@/lib/api/radio-stations';
import type {RadioStationResponse} from '@/types/api/radio-stations';

const radioStationFields = [
    {
        name: 'name',
        label: 'Name',
        required: true
    },
    {
        name: 'active',
        label: 'Active',
        type: 'switch' as const
    },
    {
        name: 'verified',
        label: 'Verified',
        type: 'switch' as const
    }
];

interface AddRadioStationModalProps {
    open: boolean;
    onCancel: () => void;
    onSuccess: () => void;
}

export default function AddRadioStationModal({open, onCancel, onSuccess}: AddRadioStationModalProps) {
    return (
        <EntityModal<RadioStationResponse>
            title="Add Radio Station"
            open={open}
            onCancel={onCancel}
            onSuccess={onSuccess}
            fields={radioStationFields}
            onSubmit={createRadioStation}
            successMessage="Radio station created successfully"
        />
    );
}