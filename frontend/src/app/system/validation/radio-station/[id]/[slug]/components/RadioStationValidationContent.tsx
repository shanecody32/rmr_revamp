'use client'

import { useEffect, useState, useCallback } from 'react';
import {
    App,
    Avatar,
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
} from 'antd';
import {
    CheckCircleOutlined,
    CloseCircleOutlined,
    EditOutlined,
    ExclamationCircleOutlined,
    EyeOutlined,
    SafetyCertificateOutlined,
    SyncOutlined,
    FileSearchOutlined,
    StopOutlined,
    WifiOutlined,
    GlobalOutlined,
} from '@ant-design/icons';
import DOMPurify from 'dompurify';
import Link from 'next/link';

import LoadingSpinner from '@/components/common/feedback/LoadingSpinner';
import { EntityStatusBadge } from '@/components/common/status';
import { fetchRadioStationById } from '@/lib/api/radio-stations';
import {
    updateDataStatus,
    updateChartStatus,
    markValidated,
    approveForCharting,
} from '@/lib/api/status';
import type { RadioStationResponse } from '@/types/api/radio-stations';
import type { DataStatus, ChartStatus } from '@/types/api/common';

const { Text, Title } = Typography;
const { TextArea } = Input;

interface RadioStationValidationContentProps {
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

export default function RadioStationValidationContent({ id, slug }: RadioStationValidationContentProps) {
    const [station, setStation] = useState<RadioStationResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const { message, modal } = App.useApp();

    const [statusModalOpen, setStatusModalOpen] = useState(false);
    const [statusModalType, setStatusModalType] = useState<'data' | 'chart'>('data');
    const [selectedStatus, setSelectedStatus] = useState<string>('');
    const [statusNote, setStatusNote] = useState('');
    const [denialReason, setDenialReason] = useState('');

    const loadStation = useCallback(async () => {
        try {
            setLoading(true);
            const data = await fetchRadioStationById(parseInt(id));
            setStation(data);
        } catch (err) {
            console.error('Error loading radio station:', err);
            message.error('Failed to load radio station details');
        } finally {
            setLoading(false);
        }
    }, [id, message]);

    useEffect(() => {
        loadStation();
    }, [loadStation]);

    const handleMarkValidated = async () => {
        if (!station) return;
        try {
            setUpdating(true);
            await markValidated('radio-stations', station.id);
            message.success('Radio station marked as validated');
            await loadStation();
        } catch (err) {
            console.error('Error updating status:', err);
            message.error('Failed to update status');
        } finally {
            setUpdating(false);
        }
    };

    const handleApproveForCharting = async () => {
        if (!station) return;
        const dataStatus = (station as any).data_status || 'new';
        if (dataStatus !== 'validated') {
            modal.confirm({
                title: 'Approve without validation?',
                icon: <ExclamationCircleOutlined />,
                content: 'This radio station has not been validated yet. Are you sure you want to approve for charting?',
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
        if (!station) return;
        try {
            setUpdating(true);
            await approveForCharting('radio-stations', station.id);
            message.success('Radio station approved for charting');
            await loadStation();
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
        if (!station || !selectedStatus) return;

        try {
            setUpdating(true);
            if (statusModalType === 'data') {
                await updateDataStatus('radio-stations', station.id, {
                    status: selectedStatus as DataStatus,
                    reason: 'manual',
                    note: statusNote || undefined,
                });
            } else {
                await updateChartStatus('radio-stations', station.id, {
                    status: selectedStatus as ChartStatus,
                    denial_reason: denialReason || undefined,
                    note: statusNote || undefined,
                });
            }
            message.success('Status updated successfully');
            setStatusModalOpen(false);
            await loadStation();
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

    if (!station) {
        return (
            <Card className="m-6">
                <div className="text-center text-red-500">Radio station not found</div>
            </Card>
        );
    }

    const dataStatus: DataStatus = (station as any).data_status || 'new';
    const chartStatus: ChartStatus = (station as any).chart_status || 'pending';
    const dataStatusReason = (station as any).data_status_reason;
    const chartDenialReason = (station as any).chart_denial_reason;
    const dataStatusNote = (station as any).data_status_note;
    const chartStatusNote = (station as any).chart_status_note;

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
                            <Link href={`/radio-stations/edit/${station.id}/${station.slug}`}>
                                <Button icon={<EditOutlined />}>Edit Station</Button>
                            </Link>
                            <Link href={`/system/duplicates?entity=radio_stations&search=${encodeURIComponent(station.name)}`}>
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
                    <span>Station Info</span>
                </span>
            ),
            children: (
                <div className="space-y-6">
                    <Card
                        title="Basic Information"
                        extra={
                            <Link href={`/radio-stations/edit/${station.id}/${station.slug}`}>
                                <Button icon={<EditOutlined />}>Edit</Button>
                            </Link>
                        }
                    >
                        <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
                            <Descriptions.Item label="ID">{station.id}</Descriptions.Item>
                            <Descriptions.Item label="Name">{station.name}</Descriptions.Item>
                            <Descriptions.Item label="Slug">{station.slug}</Descriptions.Item>
                            <Descriptions.Item label="Station Type">
                                <Tag
                                    icon={station.station_type === 'internet' ? <GlobalOutlined /> : <WifiOutlined />}
                                    color={station.station_type === 'internet' ? 'blue' : 'green'}
                                >
                                    {station.station_type === 'internet' ? 'Internet' : 'Terrestrial'}
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Active">
                                {station.active ? <Tag color="green">Yes</Tag> : <Tag color="red">No</Tag>}
                            </Descriptions.Item>
                            <Descriptions.Item label="Influence">
                                {station.influence}
                            </Descriptions.Item>
                            <Descriptions.Item label="Automatic">
                                {station.automatic ? <Tag color="blue">Yes</Tag> : <Tag>No</Tag>}
                            </Descriptions.Item>
                            <Descriptions.Item label="No Show">
                                {station.no_show ? <Tag color="orange">Yes</Tag> : <Tag>No</Tag>}
                            </Descriptions.Item>
                        </Descriptions>

                        {station.info && (
                            <>
                                <Divider>Additional Info</Divider>
                                <div
                                    className="prose max-w-none"
                                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(station.info) }}
                                />
                            </>
                        )}
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
                            icon={station.station_type === 'internet' ? <GlobalOutlined /> : <WifiOutlined />}
                            style={{
                                backgroundColor: station.station_type === 'internet' ? '#1890ff' : '#52c41a',
                            }}
                        />
                        <div>
                            <Title level={4} style={{ margin: 0 }}>{station.name}</Title>
                            <div className="mt-1">
                                <Tag
                                    icon={station.station_type === 'internet' ? <GlobalOutlined /> : <WifiOutlined />}
                                    color={station.station_type === 'internet' ? 'blue' : 'green'}
                                >
                                    {station.station_type === 'internet' ? 'Internet Station' : 'Terrestrial Station'}
                                </Tag>
                                {station.active && <Tag color="green">Active</Tag>}
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
                        <Link href={`/radio-stations/view/${station.id}/${station.slug}`}>
                            <Button icon={<EyeOutlined />}>View</Button>
                        </Link>
                        <Link href={`/radio-stations/edit/${station.id}/${station.slug}`}>
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
