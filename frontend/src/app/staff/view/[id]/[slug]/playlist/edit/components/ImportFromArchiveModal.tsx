'use client';

import { ImportOutlined, CalendarOutlined } from '@ant-design/icons';
import { App, Modal, Radio, Space, Typography, Alert } from 'antd';
import { useCallback, useEffect, useState } from 'react';

import { fetchArchiveWeeks, importFromArchive } from '@/lib/api/staff-playlists';

const { Text } = Typography;

interface ImportFromArchiveModalProps {
    open: boolean;
    staffId: number;
    onCancel: () => void;
    onComplete: () => void;
}

export default function ImportFromArchiveModal({
    open,
    staffId,
    onCancel,
    onComplete,
}: ImportFromArchiveModalProps) {
    const [mostRecentWeek, setMostRecentWeek] = useState<string | null>(null);
    const [withSpins, setWithSpins] = useState(true);
    const [loading, setLoading] = useState(false);
    const [weeksLoading, setWeeksLoading] = useState(false);
    const { message } = App.useApp();

    useEffect(() => {
        if (!open) return;
        const loadWeeks = async () => {
            try {
                setWeeksLoading(true);
                const weeks = await fetchArchiveWeeks(staffId);
                if (weeks.length > 0) {
                    setMostRecentWeek(weeks[0].week_ending);
                } else {
                    setMostRecentWeek(null);
                }
            } catch (err) {
                console.error('Error loading archive weeks:', err);
                message.error('Failed to load archive weeks');
                setMostRecentWeek(null);
            } finally {
                setWeeksLoading(false);
            }
        };
        loadWeeks();
    }, [open, staffId, message]);

    const handleImport = useCallback(async () => {
        if (!mostRecentWeek) return;
        try {
            setLoading(true);
            const result = await importFromArchive({
                staff_member_id: staffId,
                week_ending: mostRecentWeek,
                with_spins: withSpins,
            });
            message.success(
                `Imported ${result.imported_count} entries, skipped ${result.skipped_count} duplicates`
            );
            onComplete();
        } catch (err) {
            console.error('Error importing from archive:', err);
            message.error('Failed to import from archive');
        } finally {
            setLoading(false);
        }
    }, [staffId, mostRecentWeek, withSpins, message, onComplete]);

    const hasArchive = mostRecentWeek !== null;

    return (
        <Modal
            title={
                <Space>
                    <ImportOutlined />
                    <span>Import Last Week&apos;s Playlist</span>
                </Space>
            }
            open={open}
            onCancel={onCancel}
            onOk={handleImport}
            okText="Import"
            confirmLoading={loading}
            okButtonProps={{ disabled: !hasArchive || weeksLoading }}
        >
            <div className="space-y-6 py-4">
                {weeksLoading ? (
                    <div className="text-center py-4">
                        <Text type="secondary">Loading archive...</Text>
                    </div>
                ) : hasArchive ? (
                    <>
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <CalendarOutlined className="text-blue-500" />
                                <Text strong>Week Ending</Text>
                            </div>
                            <Text className="text-lg">{mostRecentWeek}</Text>
                        </div>

                        <div>
                            <Text strong className="block mb-2">Import Options</Text>
                            <Radio.Group value={withSpins} onChange={(e) => setWithSpins(e.target.value)}>
                                <Space direction="vertical">
                                    <Radio value={true}>
                                        <div>
                                            <Text>With Spins</Text>
                                            <br />
                                            <Text type="secondary" className="text-xs">
                                                Import entries with their original spin counts
                                            </Text>
                                        </div>
                                    </Radio>
                                    <Radio value={false}>
                                        <div>
                                            <Text>Without Spins (blank for fast entry)</Text>
                                            <br />
                                            <Text type="secondary" className="text-xs">
                                                Import entries with blank spins - tab through to enter new values
                                            </Text>
                                        </div>
                                    </Radio>
                                </Space>
                            </Radio.Group>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded p-3">
                            <Text type="secondary" className="text-xs">
                                Entries that already exist in the current playlist (matching band + song + album)
                                will be skipped to prevent duplicates.
                            </Text>
                        </div>
                    </>
                ) : (
                    <Alert
                        type="info"
                        message="No Previous Playlist Found"
                        description="There are no archived playlists available to import from."
                        showIcon
                    />
                )}
            </div>
        </Modal>
    );
}
