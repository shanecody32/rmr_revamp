'use client';

import { CheckCircleOutlined, LockOutlined, UnlockOutlined } from '@ant-design/icons';
import { App, Alert, Button, Space } from 'antd';
import { useCallback, useState } from 'react';

import { finalisePlaylist, unlockPlaylist } from '@/lib/api/staff-playlists';

interface LockPlaylistControlsProps {
    staffId: number;
    isFinalised: boolean;
    onStateChange: () => void;
}

export default function LockPlaylistControls({
    staffId,
    isFinalised,
    onStateChange,
}: LockPlaylistControlsProps) {
    const [loading, setLoading] = useState(false);
    const { message, modal } = App.useApp();

    const handleFinalise = useCallback(() => {
        modal.confirm({
            title: 'Finalise Playlist',
            icon: <CheckCircleOutlined />,
            content:
                'Are you sure you want to finalise this playlist? The playlist will be locked for editing and marked as reported.',
            okText: 'Finalise',
            onOk: async () => {
                try {
                    setLoading(true);
                    await finalisePlaylist(staffId);
                    message.success('Playlist finalised and locked');
                    onStateChange();
                } catch (err) {
                    console.error('Error finalising playlist:', err);
                    message.error('Failed to finalise playlist');
                } finally {
                    setLoading(false);
                }
            },
        });
    }, [staffId, message, modal, onStateChange]);

    const handleUnlock = useCallback(async () => {
        try {
            setLoading(true);
            await unlockPlaylist(staffId);
            message.success('Playlist unlocked for editing');
            onStateChange();
        } catch (err) {
            console.error('Error unlocking playlist:', err);
            message.error('Failed to unlock playlist');
        } finally {
            setLoading(false);
        }
    }, [staffId, message, onStateChange]);

    if (isFinalised) {
        return (
            <Alert
                type="success"
                showIcon
                icon={<LockOutlined />}
                message="Playlist Finalised"
                description="This playlist has been finalised and locked. Unlock it to make changes."
                className="mb-6"
                action={
                    <Button
                        icon={<UnlockOutlined />}
                        onClick={handleUnlock}
                        loading={loading}
                    >
                        Unlock for Editing
                    </Button>
                }
            />
        );
    }

    return (
        <div className="mb-6 flex justify-end">
            <Button
                type="primary"
                icon={<LockOutlined />}
                onClick={handleFinalise}
                loading={loading}
            >
                Finalise &amp; Lock Playlist
            </Button>
        </div>
    );
}
