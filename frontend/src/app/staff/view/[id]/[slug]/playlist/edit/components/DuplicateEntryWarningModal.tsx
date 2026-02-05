'use client';

import { WarningOutlined } from '@ant-design/icons';
import { Button, Modal, Space, Typography } from 'antd';

import type { PlaylistEntry } from '@/types/api/staff-playlists';

const { Text } = Typography;

interface DuplicateEntryWarningModalProps {
    open: boolean;
    existingEntry: PlaylistEntry | null;
    pendingSpins: number | null;
    onAddSpins: () => void;
    onAddSeparate: () => void;
    onCancel: () => void;
}

export default function DuplicateEntryWarningModal({
    open,
    existingEntry,
    pendingSpins,
    onAddSpins,
    onAddSeparate,
    onCancel,
}: DuplicateEntryWarningModalProps) {
    if (!existingEntry) return null;

    return (
        <Modal
            title={
                <Space>
                    <WarningOutlined className="text-orange-500" />
                    <span>Duplicate Entry Found</span>
                </Space>
            }
            open={open}
            onCancel={onCancel}
            footer={
                <Space>
                    <Button onClick={onCancel}>Cancel</Button>
                    <Button
                        type="primary"
                        onClick={onAddSpins}
                        disabled={pendingSpins === null || pendingSpins === undefined}
                    >
                        Add to Existing Spins
                    </Button>
                    <Button onClick={onAddSeparate}>
                        Add as Separate Entry
                    </Button>
                </Space>
            }
        >
            <div className="space-y-4 py-4">
                <Text>
                    An entry for this band and song already exists in the playlist:
                </Text>

                <div className="bg-orange-50 border border-orange-200 rounded p-4">
                    <div className="space-y-2">
                        <div>
                            <Text strong>Band: </Text>
                            <Text>{existingEntry.band_name || 'Unknown'}</Text>
                        </div>
                        <div>
                            <Text strong>Song: </Text>
                            <Text>{existingEntry.song_name || 'Unknown'}</Text>
                        </div>
                        {existingEntry.album_name && (
                            <div>
                                <Text strong>Album: </Text>
                                <Text>{existingEntry.album_name}</Text>
                            </div>
                        )}
                        <div>
                            <Text strong>Current Spins: </Text>
                            <Text>{existingEntry.spins ?? 'None'}</Text>
                        </div>
                    </div>
                </div>

                {pendingSpins !== null && (
                    <Text type="secondary">
                        New spins to add: <Text strong>{pendingSpins}</Text>
                        {existingEntry.spins !== null && (
                            <> (total would be {(existingEntry.spins || 0) + pendingSpins})</>
                        )}
                    </Text>
                )}
            </div>
        </Modal>
    );
}
