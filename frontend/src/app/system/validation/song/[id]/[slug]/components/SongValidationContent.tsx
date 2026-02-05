'use client'

import { useEffect, useState, useCallback } from 'react';
import {
    App,
    Button,
    Card,
    Descriptions,
    Divider,
    Modal,
    Space,
    Tabs,
    Tag,
    Typography,
    Input,
    Select,
    Alert,
} from 'antd';
import {
    CheckCircleOutlined,
    CloseCircleOutlined,
    EditOutlined,
    ExclamationCircleOutlined,
    EyeOutlined,
    SafetyCertificateOutlined,
    SwapOutlined,
    SyncOutlined,
    FileSearchOutlined,
    StopOutlined,
    UserOutlined,
    CustomerServiceOutlined,
} from '@ant-design/icons';
import Link from 'next/link';

import LoadingSpinner from '@/components/common/feedback/LoadingSpinner';
import { EntityStatusBadge, StatusPopover } from '@/components/common/status';
import { fetchSongById } from '@/lib/api/songs';
import {
    updateDataStatus,
    updateChartStatus,
    markValidated,
    approveForCharting,
} from '@/lib/api/status';
import type { SongResponse } from '@/types/api/songs';
import type { DataStatus, ChartStatus } from '@/types/api/common';

const { Text, Title, Paragraph } = Typography;
const { TextArea } = Input;

interface SongValidationContentProps {
    id: string;
    slug: string;
}

const dataStatusOptions: { value: DataStatus; label: string; color: string }[] = [
    { value: 'new', label: 'New', color: 'default' },
    { value: 'validated', label: 'Validated', color: 'success' },
    { value: 'needs_review', label: 'Needs Review', color: 'warning' },
    { value: 'duplicate_detected', label: 'Duplicate Detected', color: 'error' },
];

const chartStatusOptions: { value: ChartStatus; label: string; color: string }[] = [
    { value: 'pending', label: 'Pending', color: 'processing' },
    { value: 'approved', label: 'Approved', color: 'success' },
    { value: 'denied', label: 'Denied', color: 'error' },
    { value: 'suspended', label: 'Suspended', color: 'warning' },
];

const versionTypeLabels: Record<string, { label: string; color: string }> = {
    original: { label: 'Original', color: 'default' },
    remix: { label: 'Remix', color: 'purple' },
    live: { label: 'Live', color: 'red' },
    acoustic: { label: 'Acoustic', color: 'green' },
    cover: { label: 'Cover', color: 'blue' },
    radio_edit: { label: 'Radio Edit', color: 'cyan' },
    extended: { label: 'Extended', color: 'orange' },
};

export default function SongValidationContent({ id, slug }: SongValidationContentProps) {
    const [song, setSong] = useState<SongResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const { message, modal } = App.useApp();

    // Modal states
    const [statusModalOpen, setStatusModalOpen] = useState(false);
    const [statusModalType, setStatusModalType] = useState<'data' | 'chart'>('data');
    const [selectedStatus, setSelectedStatus] = useState<string>('');
    const [statusNote, setStatusNote] = useState('');
    const [denialReason, setDenialReason] = useState('');

    const loadSong = useCallback(async () => {
        try {
            setLoading(true);
            const data = await fetchSongById(parseInt(id));
            setSong(data);
        } catch (err) {
            console.error('Error loading song:', err);
            message.error('Failed to load song details');
        } finally {
            setLoading(false);
        }
    }, [id, message]);

    useEffect(() => {
        loadSong();
    }, [loadSong]);

    const handleMarkValidated = async () => {
        if (!song) return;
        try {
            setUpdating(true);
            await markValidated('songs', song.id);
            message.success('Song marked as validated');
            await loadSong();
        } catch (err) {
            console.error('Error updating status:', err);
            message.error('Failed to update status');
        } finally {
            setUpdating(false);
        }
    };

    const handleApproveForCharting = async () => {
        if (!song) return;
        const dataStatus = (song as any).data_status || 'new';
        if (dataStatus !== 'validated') {
            modal.confirm({
                title: 'Approve without validation?',
                icon: <ExclamationCircleOutlined />,
                content: 'This song has not been validated yet. Are you sure you want to approve it for charting?',
                okText: 'Approve Anyway',
                cancelText: 'Cancel',
                onOk: async () => {
                    await doApprove();
                },
            });
        } else {
            await doApprove();
        }
    };

    const doApprove = async () => {
        if (!song) return;
        try {
            setUpdating(true);
            await approveForCharting('songs', song.id);
            message.success('Song approved for charting');
            await loadSong();
        } catch (err) {
            console.error('Error updating status:', err);
            message.error('Failed to update status');
        } finally {
            setUpdating(false);
        }
    };

    const handleDenyFromCharting = () => {
        setStatusModalType('chart');
        setSelectedStatus('denied');
        setStatusNote('');
        setDenialReason('');
        setStatusModalOpen(true);
    };

    const handleOpenStatusModal = (type: 'data' | 'chart') => {
        setStatusModalType(type);
        setSelectedStatus('');
        setStatusNote('');
        setDenialReason('');
        setStatusModalOpen(true);
    };

    const handleStatusModalSubmit = async () => {
        if (!song || !selectedStatus) return;

        try {
            setUpdating(true);
            if (statusModalType === 'data') {
                await updateDataStatus('songs', song.id, {
                    status: selectedStatus as DataStatus,
                    reason: 'manual',
                    note: statusNote || undefined,
                });
            } else {
                await updateChartStatus('songs', song.id, {
                    status: selectedStatus as ChartStatus,
                    denial_reason: denialReason || undefined,
                    note: statusNote || undefined,
                });
            }
            message.success('Status updated successfully');
            setStatusModalOpen(false);
            await loadSong();
        } catch (err) {
            console.error('Error updating status:', err);
            message.error('Failed to update status');
        } finally {
            setUpdating(false);
        }
    };

    if (loading) {
        return <LoadingSpinner className="min-h-screen" />;
    }

    if (!song) {
        return (
            <Card className="m-6">
                <div className="text-center text-red-500">Song not found</div>
            </Card>
        );
    }

    const dataStatus: DataStatus = (song as any).data_status || 'new';
    const chartStatus: ChartStatus = (song as any).chart_status || 'pending';
    const dataStatusReason = (song as any).data_status_reason;
    const chartDenialReason = (song as any).chart_denial_reason;
    const dataStatusNote = (song as any).data_status_note;
    const chartStatusNote = (song as any).chart_status_note;
    const versionType = (song as any).version_type || 'original';
    const versionConfig = versionTypeLabels[versionType] || versionTypeLabels.original;

    const formatDuration = (seconds?: number) => {
        if (!seconds) return 'Unknown';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const tabItems = [
        {
            key: 'status',
            label: (
                <span className="flex items-center gap-1">
                    <SafetyCertificateOutlined />
                    <span>Status & Validation</span>
                </span>
            ),
            children: (
                <div className="space-y-6">
                    <Card title="Current Status">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="border rounded-lg p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <Text strong>Data Status</Text>
                                    <Button size="small" onClick={() => handleOpenStatusModal('data')}>
                                        Change
                                    </Button>
                                </div>
                                <div className="mb-3">
                                    <Tag
                                        color={dataStatusOptions.find(o => o.value === dataStatus)?.color}
                                    >
                                        {dataStatusOptions.find(o => o.value === dataStatus)?.label || dataStatus}
                                    </Tag>
                                </div>
                                {dataStatusReason && (
                                    <div className="text-sm text-gray-500 mb-2">
                                        Reason: {dataStatusReason}
                                    </div>
                                )}
                                {dataStatusNote && (
                                    <div className="text-sm bg-gray-50 p-2 rounded">
                                        Note: {dataStatusNote}
                                    </div>
                                )}
                            </div>

                            <div className="border rounded-lg p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <Text strong>Chart Status</Text>
                                    <Button size="small" onClick={() => handleOpenStatusModal('chart')}>
                                        Change
                                    </Button>
                                </div>
                                <div className="mb-3">
                                    <Tag
                                        color={chartStatusOptions.find(o => o.value === chartStatus)?.color}
                                        icon={
                                            chartStatus === 'approved' ? <CheckCircleOutlined /> :
                                            chartStatus === 'denied' ? <CloseCircleOutlined /> :
                                            chartStatus === 'suspended' ? <StopOutlined /> :
                                            <SyncOutlined spin />
                                        }
                                    >
                                        {chartStatusOptions.find(o => o.value === chartStatus)?.label || chartStatus}
                                    </Tag>
                                </div>
                                {chartDenialReason && (
                                    <div className="text-sm text-gray-500 mb-2">
                                        Denial Reason: {chartDenialReason}
                                    </div>
                                )}
                                {chartStatusNote && (
                                    <div className="text-sm bg-gray-50 p-2 rounded">
                                        Note: {chartStatusNote}
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>

                    <Card title="Quick Actions">
                        <Space wrap>
                            <Button
                                type="primary"
                                icon={<CheckCircleOutlined />}
                                onClick={handleMarkValidated}
                                loading={updating}
                                disabled={dataStatus === 'validated'}
                            >
                                Mark as Validated
                            </Button>
                            <Button
                                type="primary"
                                icon={<SafetyCertificateOutlined />}
                                onClick={handleApproveForCharting}
                                loading={updating}
                                disabled={chartStatus === 'approved'}
                                style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                            >
                                Approve for Charting
                            </Button>
                            <Button
                                danger
                                icon={<CloseCircleOutlined />}
                                onClick={handleDenyFromCharting}
                                loading={updating}
                                disabled={chartStatus === 'denied'}
                            >
                                Deny from Charting
                            </Button>
                            <Divider type="vertical" />
                            <Link href={`/songs/edit/${song.id}/${song.slug}`}>
                                <Button icon={<EditOutlined />}>Edit Song</Button>
                            </Link>
                            <Link href={`/system/duplicates?entity=songs&search=${encodeURIComponent(song.name)}`}>
                                <Button icon={<FileSearchOutlined />}>Find Duplicates</Button>
                            </Link>
                        </Space>
                    </Card>
                </div>
            ),
        },
        {
            key: 'info',
            label: (
                <span className="flex items-center gap-1">
                    <EyeOutlined />
                    <span>Song Info</span>
                </span>
            ),
            children: (
                <div className="space-y-6">
                    <Card
                        title="Basic Information"
                        extra={
                            <Link href={`/songs/edit/${song.id}/${song.slug}`}>
                                <Button icon={<EditOutlined />}>Edit</Button>
                            </Link>
                        }
                    >
                        <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
                            <Descriptions.Item label="ID">{song.id}</Descriptions.Item>
                            <Descriptions.Item label="Name">{song.name}</Descriptions.Item>
                            <Descriptions.Item label="Slug">{song.slug}</Descriptions.Item>
                            <Descriptions.Item label="Version Type">
                                <Tag color={versionConfig.color}>{versionConfig.label}</Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Duration">
                                {formatDuration(song.length)}
                            </Descriptions.Item>
                            <Descriptions.Item label="Release Date">
                                {song.release_date ? new Date(song.release_date).toLocaleDateString() : 'Not set'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Band ID">
                                {song.band_id}
                            </Descriptions.Item>
                            <Descriptions.Item label="Sub-Genre ID">
                                {song.sub_genre_id || 'Not set'}
                            </Descriptions.Item>
                        </Descriptions>
                    </Card>

                    <Card title="Credits">
                        <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
                            <Descriptions.Item label="Lyrics Writer">
                                {song.lyrics_writer || 'Not specified'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Music Writer">
                                {song.music_writer || 'Not specified'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Publisher">
                                {song.publisher || 'Not specified'}
                            </Descriptions.Item>
                            <Descriptions.Item label="License">
                                {song.license || 'Not specified'}
                            </Descriptions.Item>
                        </Descriptions>
                    </Card>

                    {song.lyrics && (
                        <Card title="Lyrics">
                            <Paragraph>
                                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                                    {song.lyrics}
                                </pre>
                            </Paragraph>
                        </Card>
                    )}

                    <Card title="External Links">
                        <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
                            <Descriptions.Item label="iTunes URL">
                                {song.itunes_url ? (
                                    <a href={song.itunes_url} target="_blank" rel="noopener noreferrer">
                                        View on iTunes
                                    </a>
                                ) : 'Not set'}
                            </Descriptions.Item>
                            <Descriptions.Item label="iTunes ID">
                                {song.itunes_id || 'Not set'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Rovi ID">
                                {song.rovi_id || 'Not set'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Echo ID">
                                {song.echo_id || 'Not set'}
                            </Descriptions.Item>
                        </Descriptions>
                    </Card>
                </div>
            ),
        },
        {
            key: 'transfers',
            label: (
                <span className="flex items-center gap-1">
                    <SwapOutlined />
                    <span>Transfers</span>
                </span>
            ),
            children: (
                <div className="space-y-6">
                    <Alert
                        message="Transfer Operations"
                        description="Use transfers to move this song to a different band or album."
                        type="info"
                        showIcon
                    />

                    <Card title="Transfer Song to Another Band">
                        <Text type="secondary">
                            Move this song to a different band. All playlists, archives, and statistics will be updated.
                            This feature will be fully implemented in the next update.
                        </Text>
                    </Card>

                    <Card title="Transfer Song to Another Album">
                        <Text type="secondary">
                            Move this song to a different album. For compilations, songs can appear on multiple albums.
                            This feature will be fully implemented in the next update.
                        </Text>
                    </Card>

                    <Card title="Merge with Another Song">
                        <Space direction="vertical" className="w-full">
                            <Text type="secondary">
                                If this song is a duplicate of another, you can merge them. All playlists and statistics
                                will be combined.
                            </Text>
                            <Link href={`/system/duplicates?entity=songs&search=${encodeURIComponent(song.name)}`}>
                                <Button icon={<FileSearchOutlined />}>
                                    Find Potential Duplicates to Merge
                                </Button>
                            </Link>
                        </Space>
                    </Card>
                </div>
            ),
        },
    ];

    return (
        <div>
            <Card className="mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                            <CustomerServiceOutlined style={{ fontSize: 32, color: '#999' }} />
                        </div>
                        <div>
                            <Title level={4} style={{ margin: 0 }}>{song.name}</Title>
                            <div className="mt-1">
                                <Tag color={versionConfig.color}>{versionConfig.label}</Tag>
                            </div>
                            <Space className="mt-2">
                                <EntityStatusBadge
                                    dataStatus={dataStatus}
                                    chartStatus={chartStatus}
                                    dataStatusReason={dataStatusReason}
                                    chartDenialReason={chartDenialReason}
                                    compact={true}
                                />
                            </Space>
                        </div>
                    </div>
                    <Space>
                        <Link href={`/songs/view/${song.id}/${song.slug}`}>
                            <Button icon={<EyeOutlined />}>View</Button>
                        </Link>
                        <Link href={`/songs/edit/${song.id}/${song.slug}`}>
                            <Button icon={<EditOutlined />}>Edit</Button>
                        </Link>
                    </Space>
                </div>
            </Card>

            <Card>
                <Tabs defaultActiveKey="status" items={tabItems} size="large" />
            </Card>

            <Modal
                title={statusModalType === 'data' ? 'Update Data Status' : 'Update Chart Status'}
                open={statusModalOpen}
                onCancel={() => setStatusModalOpen(false)}
                onOk={handleStatusModalSubmit}
                confirmLoading={updating}
                okButtonProps={{ disabled: !selectedStatus }}
            >
                <div className="space-y-4">
                    <div>
                        <Text strong>New Status</Text>
                        <Select<string>
                            className="w-full mt-2"
                            placeholder="Select status"
                            value={selectedStatus || undefined}
                            onChange={setSelectedStatus}
                            options={
                                (statusModalType === 'data' ? dataStatusOptions : chartStatusOptions)
                                    .map(o => ({ value: o.value as string, label: o.label }))
                            }
                        />
                    </div>

                    {statusModalType === 'chart' && selectedStatus === 'denied' && (
                        <div>
                            <Text strong>Denial Reason</Text>
                            <Select
                                className="w-full mt-2"
                                placeholder="Select reason"
                                value={denialReason || undefined}
                                onChange={setDenialReason}
                                options={[
                                    { value: 'duplicate', label: 'Duplicate Entry' },
                                    { value: 'terms_violation', label: 'Terms Violation' },
                                    { value: 'editorial', label: 'Editorial Decision' },
                                    { value: 'spam', label: 'Spam' },
                                    { value: 'other', label: 'Other' },
                                ]}
                            />
                        </div>
                    )}

                    <div>
                        <Text strong>Note (optional)</Text>
                        <TextArea
                            className="mt-2"
                            placeholder="Add a note about this status change..."
                            value={statusNote}
                            onChange={(e) => setStatusNote(e.target.value)}
                            rows={3}
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
}
