'use client'

import { useEffect, useState, useCallback } from 'react';
import {
    App,
    Avatar,
    Button,
    Card,
    Descriptions,
    Divider,
    List,
    Modal,
    Space,
    Table,
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
    PlayCircleOutlined,
    SafetyCertificateOutlined,
    SwapOutlined,
    SyncOutlined,
    FileSearchOutlined,
    StopOutlined,
    UserOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import type { ColumnsType } from 'antd/es/table';

import LoadingSpinner from '@/components/common/feedback/LoadingSpinner';
import { EntityStatusBadge, StatusPopover } from '@/components/common/status';
import { fetchAlbumById } from '@/lib/api/albums';
import {
    updateDataStatus,
    updateChartStatus,
    markValidated,
    approveForCharting,
} from '@/lib/api/status';
import { getAlbumDisplayImageUrl } from '@/lib/utils/media';
import type { AlbumWithRelationsResponse } from '@/types/api/albums';
import type { SongWithTrackInfoResponse } from '@/types/api/songs';
import type { DataStatus, ChartStatus } from '@/types/api/common';

const { Text, Title } = Typography;
const { TextArea } = Input;

interface AlbumValidationContentProps {
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

export default function AlbumValidationContent({ id, slug }: AlbumValidationContentProps) {
    const [album, setAlbum] = useState<AlbumWithRelationsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const { message, modal } = App.useApp();

    // Modal states
    const [statusModalOpen, setStatusModalOpen] = useState(false);
    const [statusModalType, setStatusModalType] = useState<'data' | 'chart'>('data');
    const [selectedStatus, setSelectedStatus] = useState<string>('');
    const [statusNote, setStatusNote] = useState('');
    const [denialReason, setDenialReason] = useState('');

    const loadAlbum = useCallback(async () => {
        try {
            setLoading(true);
            const data = await fetchAlbumById(parseInt(id));
            setAlbum(data);
        } catch (err) {
            console.error('Error loading album:', err);
            message.error('Failed to load album details');
        } finally {
            setLoading(false);
        }
    }, [id, message]);

    useEffect(() => {
        loadAlbum();
    }, [loadAlbum]);

    const handleMarkValidated = async () => {
        if (!album) return;
        try {
            setUpdating(true);
            await markValidated('albums', album.id);
            message.success('Album marked as validated');
            await loadAlbum();
        } catch (err) {
            console.error('Error updating status:', err);
            message.error('Failed to update status');
        } finally {
            setUpdating(false);
        }
    };

    const handleApproveForCharting = async () => {
        if (!album) return;
        const dataStatus = (album as any).data_status || 'new';
        if (dataStatus !== 'validated') {
            modal.confirm({
                title: 'Approve without validation?',
                icon: <ExclamationCircleOutlined />,
                content: 'This album has not been validated yet. Are you sure you want to approve it for charting?',
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
        if (!album) return;
        try {
            setUpdating(true);
            await approveForCharting('albums', album.id);
            message.success('Album approved for charting');
            await loadAlbum();
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
        if (!album || !selectedStatus) return;

        try {
            setUpdating(true);
            if (statusModalType === 'data') {
                await updateDataStatus('albums', album.id, {
                    status: selectedStatus as DataStatus,
                    reason: 'manual',
                    note: statusNote || undefined,
                });
            } else {
                await updateChartStatus('albums', album.id, {
                    status: selectedStatus as ChartStatus,
                    denial_reason: denialReason || undefined,
                    note: statusNote || undefined,
                });
            }
            message.success('Status updated successfully');
            setStatusModalOpen(false);
            await loadAlbum();
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

    if (!album) {
        return (
            <Card className="m-6">
                <div className="text-center text-red-500">Album not found</div>
            </Card>
        );
    }

    const dataStatus: DataStatus = (album as any).data_status || 'new';
    const chartStatus: ChartStatus = (album as any).chart_status || 'pending';
    const dataStatusReason = (album as any).data_status_reason;
    const chartDenialReason = (album as any).chart_denial_reason;
    const dataStatusNote = (album as any).data_status_note;
    const chartStatusNote = (album as any).chart_status_note;

    const songColumns: ColumnsType<SongWithTrackInfoResponse> = [
        {
            title: '#',
            dataIndex: 'track_number',
            key: 'track_number',
            width: 60,
            render: (_, __, index) => index + 1,
        },
        {
            title: 'Title',
            key: 'name',
            render: (_, record) => (
                <Link href={`/songs/view/${record.song.id}/${record.song.slug}`}>
                    <Text strong className="hover:text-blue-500">{record.song.name}</Text>
                </Link>
            ),
        },
        {
            title: 'Version',
            key: 'version_type',
            width: 100,
            render: (_, record) => {
                const versionType = (record.song as any).version_type || 'original';
                return versionType !== 'original' ? (
                    <Tag color="purple">{versionType}</Tag>
                ) : null;
            },
        },
        {
            title: 'Status',
            key: 'status',
            width: 150,
            render: (_, record) => (
                <EntityStatusBadge
                    dataStatus={(record.song as any).data_status || 'new'}
                    chartStatus={(record.song as any).chart_status || 'pending'}
                    compact={true}
                />
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 200,
            render: (_, record) => (
                <Space size="small">
                    <Link href={`/songs/view/${record.song.id}/${record.song.slug}`}>
                        <Button type="text" size="small" icon={<EyeOutlined />} />
                    </Link>
                    <Link href={`/songs/edit/${record.song.id}/${record.song.slug}`}>
                        <Button type="text" size="small" icon={<EditOutlined />} />
                    </Link>
                    <Link href={`/system/validation/song/${record.song.id}/${record.song.slug}`}>
                        <Button type="text" size="small" icon={<SafetyCertificateOutlined />} />
                    </Link>
                </Space>
            ),
        },
    ];

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
                            <Link href={`/albums/edit/${album.id}/${album.slug}`}>
                                <Button icon={<EditOutlined />}>Edit Album</Button>
                            </Link>
                            <Link href={`/system/duplicates?entity=albums&search=${encodeURIComponent(album.name)}`}>
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
                    <span>Album Info</span>
                </span>
            ),
            children: (
                <div className="space-y-6">
                    <Card
                        title="Basic Information"
                        extra={
                            <Link href={`/albums/edit/${album.id}/${album.slug}`}>
                                <Button icon={<EditOutlined />}>Edit</Button>
                            </Link>
                        }
                    >
                        <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
                            <Descriptions.Item label="ID">{album.id}</Descriptions.Item>
                            <Descriptions.Item label="Name">{album.name}</Descriptions.Item>
                            <Descriptions.Item label="Slug">{album.slug}</Descriptions.Item>
                            <Descriptions.Item label="Format">
                                <Tag color={(album as any).format === 'ep' ? 'orange' : (album as any).format === 'single' ? 'cyan' : 'default'}>
                                    {((album as any).format || 'lp').toUpperCase()}
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Release Date">
                                {album.release_date ? new Date(album.release_date).toLocaleDateString() : 'Not set'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Tracks">
                                {album.songs?.length || 0}
                            </Descriptions.Item>
                            <Descriptions.Item label="Band(s)" span={2}>
                                <Space wrap>
                                    {album.bands?.map(band => (
                                        <Link key={band.id} href={`/system/validation/band/${band.id}/${band.slug}`}>
                                            <Tag icon={<UserOutlined />} color="blue">
                                                {band.name}
                                            </Tag>
                                        </Link>
                                    ))}
                                </Space>
                            </Descriptions.Item>
                            <Descriptions.Item label="Compilation">
                                {album.compilation ? <Tag color="purple">Yes</Tag> : 'No'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Soundtrack">
                                {album.soundtrack ? <Tag color="gold">Yes</Tag> : 'No'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Genres" span={2}>
                                <Space wrap>
                                    {album.genres?.map(g => (
                                        <Tag key={g.id} color="blue">{g.name}</Tag>
                                    ))}
                                    {(!album.genres || album.genres.length === 0) && (
                                        <Text type="secondary">None</Text>
                                    )}
                                </Space>
                            </Descriptions.Item>
                            <Descriptions.Item label="Sub-Genres" span={2}>
                                <Space wrap>
                                    {album.sub_genres?.map(g => (
                                        <Tag key={g.id} color="purple">{g.name}</Tag>
                                    ))}
                                    {(!album.sub_genres || album.sub_genres.length === 0) && (
                                        <Text type="secondary">None</Text>
                                    )}
                                </Space>
                            </Descriptions.Item>
                        </Descriptions>

                        {album.about && (
                            <>
                                <Divider>About</Divider>
                                <div
                                    className="prose max-w-none"
                                    dangerouslySetInnerHTML={{ __html: album.about }}
                                />
                            </>
                        )}
                    </Card>
                </div>
            ),
        },
        {
            key: 'songs',
            label: (
                <span className="flex items-center gap-1">
                    <PlayCircleOutlined />
                    <span>Songs ({album.songs?.length || 0})</span>
                </span>
            ),
            children: (
                <div className="space-y-6">
                    {album.songs && album.songs.length > 0 ? (
                        <Card>
                            <Table
                                dataSource={album.songs}
                                columns={songColumns}
                                rowKey="id"
                                pagination={false}
                                size="small"
                            />
                        </Card>
                    ) : (
                        <Card>
                            <div className="text-center py-8">
                                <Text type="secondary">No songs found on this album.</Text>
                            </div>
                        </Card>
                    )}
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
                        description="Use transfers to move this album to a different band, or move songs to/from this album."
                        type="info"
                        showIcon
                    />

                    <Card title="Transfer Album to Another Band">
                        <Text type="secondary">
                            Move this album (and optionally all its songs) to a different band.
                            This feature will be fully implemented in the next update.
                        </Text>
                    </Card>

                    <Card title="Manage Song Assignments">
                        <Text type="secondary">
                            Add or remove songs from this album. For compilations, songs can appear on multiple albums.
                            This feature will be fully implemented in the next update.
                        </Text>
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
                        <Avatar
                            size={64}
                            shape="square"
                            src={getAlbumDisplayImageUrl(album)}
                        >
                            {album.name.charAt(0)}
                        </Avatar>
                        <div>
                            <Title level={4} style={{ margin: 0 }}>{album.name}</Title>
                            <div className="mt-1">
                                {album.bands?.map(band => (
                                    <Link key={band.id} href={`/system/validation/band/${band.id}/${band.slug}`}>
                                        <Text type="secondary" className="hover:text-blue-500">
                                            {band.name}
                                        </Text>
                                    </Link>
                                ))}
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
                        <Link href={`/albums/view/${album.id}/${album.slug}`}>
                            <Button icon={<EyeOutlined />}>View</Button>
                        </Link>
                        <Link href={`/albums/edit/${album.id}/${album.slug}`}>
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
