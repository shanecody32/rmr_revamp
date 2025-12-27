'use client'

import EntityModal from '@/components/common/modals/EntityModal';
import {createSong} from '@/lib/api/songs';
import type {SongResponse} from '@/types/api/songs';

const songFields = [
    {
        name: 'name',
        label: 'Name',
        required: true
    },
    {
        name: 'verified',
        label: 'Verified',
        type: 'switch' as const
    }
];

interface AddSongModalProps {
    open: boolean;
    onCancel: () => void;
    onSuccess: () => void;
}

export default function AddSongModal({open, onCancel, onSuccess}: AddSongModalProps) {
    return (
        <EntityModal<SongResponse>
            title="Add Song"
            open={open}
            onCancel={onCancel}
            onSuccess={onSuccess}
            fields={songFields}
            onSubmit={createSong}
            successMessage="Song created successfully"
        />
    );
}