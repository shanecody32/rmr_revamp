'use client'

import { useEffect, useState, useCallback } from 'react';
import {
    App,
    Avatar,
    Button,
    Card,
    Descriptions,
    Divider,
    Dropdown,
    List,
    Modal,
    Space,
    Spin,
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
    MoreOutlined,
    SafetyCertificateOutlined,
    SearchOutlined,
    SwapOutlined,
    SyncOutlined,
    FileSearchOutlined,
    StopOutlined,
} from '@ant-design/icons';
import DOMPurify from 'dompurify';
import Link from 'next/link';

import LoadingSpinner from '@/components/common/feedback/LoadingSpinner';
import { EntityStatusBadge, StatusPopover } from '@/components/common/status';
import { fetchBandDetail } from '@/lib/api/bands';
import {
    updateDataStatus,
    updateChartStatus,
    markValidated,
    approveForCharting,
    denyFromCharting,
} from '@/lib/api/status';
import { getAlbumDisplayImageUrl } from '@/lib/utils/media';
import type { BandDetailView } from '@/types/api/bands';
import type { AlbumWithRelationsResponse } from '@/types/api/albums';
import type { DataStatus, ChartStatus } from '@/types/api/common';

const { Text, Title, Paragraph } = Typography;
const { TextArea } = Input;

interface BandValidationContentProps {
    id: string;
    slug: string;
}

// Status configuration for quick reference
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

export default function BandValidationContent({ id, slug }: BandValidationContentProps) {
    const [band, setBand] = useState<BandDetailView | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const { message, modal } = App.useApp();

    // Modal states
    const [statusModalOpen, setStatusModalOpen] = useState(false);
    const [statusModalType, setStatusModalType] = useState<'data' | 'chart'>('data');
    const [selectedStatus, setSelectedStatus] = useState<string>('');
    const [statusNote, setStatusNote] = useState('');
    const [denialReason, setDenialReason] = useState('');

    const loadBand = useCallback(async () => {
        try {
            setLoading(true);
            const data = await fetchBandDetail(parseInt(id), { includeAlbums: true });
            setBand(data);
        } catch (err) {
            console.error('Error loading band:', err);
            message.error('Failed to load band details');
        } finally {
            setLoading(false);
        }
    }, [id, message]);

    useEffect(() => {
        loadBand();
    }, [loadBand]);

    // Quick action handlers
    const handleMarkValidated = async () => {
        if (!band) return;
        try {
            setUpdating(true);
            await markValidated('bands', band.id);
            message.success('Band marked as validated');
            await loadBand();
        } catch (err) {
            console.error('Error updating status:', err);
            message.error('Failed to update status');
        } finally {
            setUpdating(false);
        }
    };

    const handleApproveForCharting = async () => {
        if (!band) return;

        // Check if data is validated first
        const dataStatus = (band as any).data_status || 'new';
        if (dataStatus !== 'validated') {
            modal.confirm({
                title: 'Approve without validation?',
                icon: <ExclamationCircleOutlined />,
                content: 'This band has not been validated yet. Are you sure you want to approve it for charting?',
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
        if (!band) return;
        try {
            setUpdating(true);
            await approveForCharting('bands', band.id);
            message.success('Band approved for charting');
            await loadBand();
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
        if (!band || !selectedStatus) return;

        try {
            setUpdating(true);
            if (statusModalType === 'data') {
                await updateDataStatus('bands', band.id, {
                    status: selectedStatus as DataStatus,
                    reason: 'manual',
                    note: statusNote || undefined,
                });
            } else {
                await updateChartStatus('bands', band.id, {
                    status: selectedStatus as ChartStatus,
                    denial_reason: denialReason || undefined,
                    note: statusNote || undefined,
                });
            }
            message.success('Status updated successfully');
            setStatusModalOpen(false);
            await loadBand();
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

    if (!band) {
        return (
            <Card className="m-6">
                <div className="text-center text-red-500">Band not found</div>
            </Card>
        );
    }

    // Get status values with fallbacks for legacy data
    const dataStatus: DataStatus = (band as any).data_status || 'new';
    const chartStatus: ChartStatus = (band as any).chart_status || 'pending';
    const dataStatusReason = (band as any).data_status_reason;
    const chartDenialReason = (band as any).chart_denial_reason;
    const dataStatusNote = (band as any).data_status_note;
    const chartStatusNote = (band as any).chart_status_note;

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
                    {/* Status Overview Card */}
                    <Card title="Current Status">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Data Status */}
                            <div className="border rounded-lg p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <Text strong>Data Status</Text>
                                    <Button
                                        size="small"
                                        onClick={() => handleOpenStatusModal('data')}
                                    >
                                        Change
                                    </Button>
                                </div>
                                <div className="mb-3">
                                    <EntityStatusBadge
                                        dataStatus={dataStatus}
                                        chartStatus={chartStatus}
                                        dataStatusReason={dataStatusReason}
                                        chartDenialReason={chartDenialReason}
                                        compact={false}
                                        showLabels={true}
                                    />
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

                            {/* Chart Status */}
                            <div className="border rounded-lg p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <Text strong>Chart Status</Text>
                                    <Button
                                        size="small"
                                        onClick={() => handleOpenStatusModal('chart')}
                                    >
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

                    {/* Quick Actions */}
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
                            <Link href={`/bands/edit/${band.id}/${band.slug}`}>
                                <Button icon={<EditOutlined />}>Edit Band</Button>
                            </Link>
                            <Link href={`/system/duplicates?entity=bands&search=${encodeURIComponent(band.name)}`}>
                                <Button icon={<FileSearchOutlined />}>Find Duplicates</Button>
                            </Link>
                        </Space>
                    </Card>

                    {/* Status History */}
                    <Card
                        title="Status History"
                        extra={
                            <StatusPopover
                                entityType="bands"
                                entityId={band.id}
                                entity={{
                                    data_status: dataStatus,
                                    chart_status: chartStatus,
                                    data_status_reason: dataStatusReason,
                                    chart_denial_reason: chartDenialReason,
                                    data_status_note: dataStatusNote,
                                    chart_status_note: chartStatusNote,
                                }}
                            >
                                <Button size="small">View Full History</Button>
                            </StatusPopover>
                        }
                    >
                        <Text type="secondary">
                            Click "View Full History" to see all status changes for this band.
                        </Text>
                    </Card>
                </div>
            ),
        },
        {
            key: 'info',
            label: (
                <span className="flex items-center gap-1">
                    <EyeOutlined />
                    <span>Band Info</span>
                </span>
            ),
            children: (
                <div className="space-y-6">
                    <Card
                        title="Basic Information"
                        extra={
                            <Link href={`/bands/edit/${band.id}/${band.slug}`}>
                                <Button icon={<EditOutlined />}>Edit</Button>
                            </Link>
                        }
                    >
                        <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
                            <Descriptions.Item label="ID">{band.id}</Descriptions.Item>
                            <Descriptions.Item label="Name">{band.name}</Descriptions.Item>
                            <Descriptions.Item label="Slug">{band.slug}</Descriptions.Item>
                            <Descriptions.Item label="Band Type">
                                <Tag>{(band as any).band_type || 'artist'}</Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Location" span={2}>
                                {[band.city?.name, band.state?.name, band.country?.name]
                                    .filter(Boolean)
                                    .join(', ') || 'Not specified'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Genres" span={2}>
                                <Space wrap>
                                    {band.genres?.map(g => (
                                        <Tag key={g.id} color="blue">{g.name}</Tag>
                                    ))}
                                    {(!band.genres || band.genres.length === 0) && (
                                        <Text type="secondary">None</Text>
                                    )}
                                </Space>
                            </Descriptions.Item>
                            <Descriptions.Item label="Sub-Genres" span={2}>
                                <Space wrap>
                                    {band.sub_genres?.map(g => (
                                        <Tag key={g.id} color="purple">{g.name}</Tag>
                                    ))}
                                    {(!band.sub_genres || band.sub_genres.length === 0) && (
                                        <Text type="secondary">None</Text>
                                    )}
                                </Space>
                            </Descriptions.Item>
                        </Descriptions>

                        {band.bio && (
                            <>
                                <Divider>Biography</Divider>
                                <div
                                    className="prose max-w-none"
                                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(band.bio) }}
                                />
                            </>
                        )}
                    </Card>
                </div>
            ),
        },
        {
            key: 'albums',
            label: (
                <span className="flex items-center gap-1">
                    <SearchOutlined />
                    <span>Albums ({band.albums?.length || 0})</span>
                </span>
            ),
            children: (
                <div className="space-y-6">
                    {band.albums && band.albums.length > 0 ? (
                        <List
                            grid={{ gutter: 16, xs: 1, sm: 2, md: 2, lg: 3, xl: 4 }}
                            dataSource={band.albums}
                            renderItem={(album: AlbumWithRelationsResponse) => (
                                <List.Item>
                                    <Card
                                        hoverable
                                        cover={
                                            <div className="h-48 overflow-hidden">
                                                <img
                                                    alt={album.name}
                                                    src={getAlbumDisplayImageUrl(album) || undefined}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        }
                                        actions={[
                                            <Link key="view" href={`/albums/view/${album.id}/${album.slug}`}>
                                                <Button type="text" icon={<EyeOutlined />} size="small">
                                                    View
                                                </Button>
                                            </Link>,
                                            <Link key="edit" href={`/albums/edit/${album.id}/${album.slug}`}>
                                                <Button type="text" icon={<EditOutlined />} size="small">
                                                    Edit
                                                </Button>
                                            </Link>,
                                            <Link key="validate" href={`/system/validation/album/${album.id}/${album.slug}`}>
                                                <Button type="text" icon={<SafetyCertificateOutlined />} size="small">
                                                    Validate
                                                </Button>
                                            </Link>,
                                        ]}
                                    >
                                        <Card.Meta
                                            title={
                                                <Text ellipsis={{ tooltip: album.name }}>
                                                    {album.name}
                                                </Text>
                                            }
                                            description={
                                                <Space direction="vertical" size={4}>
                                                    <Text type="secondary">
                                                        {album.release_date
                                                            ? new Date(album.release_date).getFullYear()
                                                            : 'No release date'}
                                                    </Text>
                                                    <Text type="secondary">
                                                        {album.songs?.length || 0} tracks
                                                    </Text>
                                                    <Space size={4}>
                                                        <Tag color={(album as any).format === 'ep' ? 'orange' : (album as any).format === 'single' ? 'cyan' : 'default'}>
                                                            {((album as any).format || 'lp').toUpperCase()}
                                                        </Tag>
                                                    </Space>
                                                </Space>
                                            }
                                        />
                                    </Card>
                                </List.Item>
                            )}
                        />
                    ) : (
                        <Card>
                            <div className="text-center py-8">
                                <Text type="secondary">No albums found for this band.</Text>
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
                        description="Use transfers to move albums or songs to different bands. This will update all related playlists, archives, and statistics."
                        type="info"
                        showIcon
                    />

                    <Card title="Transfer Albums to Another Band">
                        <Text type="secondary">
                            Select albums from the Albums tab and use the transfer function to move them to another band.
                            This feature will be fully implemented in the next update.
                        </Text>
                    </Card>

                    <Card title="Merge with Another Band">
                        <Space direction="vertical" className="w-full">
                            <Text type="secondary">
                                If this band is a duplicate of another, you can merge them. All albums, songs, playlists,
                                and statistics will be transferred to the target band.
                            </Text>
                            <Link href={`/system/duplicates?entity=bands&search=${encodeURIComponent(band.name)}`}>
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
            {/* Header with status summary */}
            <Card className="mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Avatar size={64} src={band.images?.[0]?.thumbname || band.images?.[0]?.filename || undefined}>
                            {band.name.charAt(0)}
                        </Avatar>
                        <div>
                            <Title level={4} style={{ margin: 0 }}>{band.name}</Title>
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
                        <Link href={`/bands/view/${band.id}/${band.slug}`}>
                            <Button icon={<EyeOutlined />}>View</Button>
                        </Link>
                        <Link href={`/bands/edit/${band.id}/${band.slug}`}>
                            <Button icon={<EditOutlined />}>Edit</Button>
                        </Link>
                    </Space>
                </div>
            </Card>

            {/* Main content tabs */}
            <Card>
                <Tabs
                    defaultActiveKey="status"
                    items={tabItems}
                    size="large"
                />
            </Card>

            {/* Status Change Modal */}
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

            <style jsx global>{`
                .validation-page .ant-tabs-nav {
                    margin-bottom: 24px;
                }

                .validation-page .ant-tabs-tab {
                    padding: 12px 0;
                    font-size: 16px;
                }

                .validation-page .ant-card-cover img {
                    transition: transform 0.3s ease;
                }

                .validation-page .ant-card:hover .ant-card-cover img {
                    transform: scale(1.05);
                }
            `}</style>
        </div>
    );
}
