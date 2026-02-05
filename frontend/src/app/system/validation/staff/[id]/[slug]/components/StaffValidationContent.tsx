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
    Alert,
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
    UserOutlined,
    MailOutlined,
    PhoneOutlined,
} from '@ant-design/icons';
import Link from 'next/link';

import LoadingSpinner from '@/components/common/feedback/LoadingSpinner';
import { EntityStatusBadge } from '@/components/common/status';
import { fetchStaffById } from '@/lib/api/staff';
import {
    updateDataStatus,
    updateChartStatus,
    markValidated,
    approveForCharting,
} from '@/lib/api/status';
import type { StaffDetailView } from '@/types/api/staff';
import type { DataStatus, ChartStatus } from '@/types/api/common';

const { Text, Title } = Typography;
const { TextArea } = Input;

interface StaffValidationContentProps {
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

export default function StaffValidationContent({ id, slug }: StaffValidationContentProps) {
    const [staff, setStaff] = useState<StaffDetailView | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const { message, modal } = App.useApp();

    const [statusModalOpen, setStatusModalOpen] = useState(false);
    const [statusModalType, setStatusModalType] = useState<'data' | 'chart'>('data');
    const [selectedStatus, setSelectedStatus] = useState<string>('');
    const [statusNote, setStatusNote] = useState('');
    const [denialReason, setDenialReason] = useState('');

    const loadStaff = useCallback(async () => {
        try {
            setLoading(true);
            const data = await fetchStaffById(parseInt(id));
            setStaff(data);
        } catch (err) {
            console.error('Error loading staff:', err);
            message.error('Failed to load staff details');
        } finally {
            setLoading(false);
        }
    }, [id, message]);

    useEffect(() => {
        loadStaff();
    }, [loadStaff]);

    const getDisplayName = (s: StaffDetailView) => {
        if (s.on_air_name) return s.on_air_name;
        if (s.first_name && s.last_name) return `${s.first_name} ${s.last_name}`;
        if (s.first_name) return s.first_name;
        if (s.last_name) return s.last_name;
        return 'Unknown';
    };

    const handleMarkValidated = async () => {
        if (!staff) return;
        try {
            setUpdating(true);
            await markValidated('staff-members', staff.id);
            message.success('Staff marked as validated');
            await loadStaff();
        } catch (err) {
            console.error('Error updating status:', err);
            message.error('Failed to update status');
        } finally {
            setUpdating(false);
        }
    };

    const handleApproveForCharting = async () => {
        if (!staff) return;
        const dataStatus = (staff as any).data_status || 'new';
        if (dataStatus !== 'validated') {
            modal.confirm({
                title: 'Approve without validation?',
                icon: <ExclamationCircleOutlined />,
                content: 'This staff member has not been validated yet. Are you sure you want to approve for charting?',
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
        if (!staff) return;
        try {
            setUpdating(true);
            await approveForCharting('staff-members', staff.id);
            message.success('Staff approved for charting');
            await loadStaff();
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
        if (!staff || !selectedStatus) return;

        try {
            setUpdating(true);
            if (statusModalType === 'data') {
                await updateDataStatus('staff-members', staff.id, {
                    status: selectedStatus as DataStatus,
                    reason: 'manual',
                    note: statusNote || undefined,
                });
            } else {
                await updateChartStatus('staff-members', staff.id, {
                    status: selectedStatus as ChartStatus,
                    denial_reason: denialReason || undefined,
                    note: statusNote || undefined,
                });
            }
            message.success('Status updated successfully');
            setStatusModalOpen(false);
            await loadStaff();
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

    if (!staff) {
        return (
            <Card className="m-6">
                <div className="text-center text-red-500">Staff member not found</div>
            </Card>
        );
    }

    const dataStatus: DataStatus = (staff as any).data_status || 'new';
    const chartStatus: ChartStatus = (staff as any).chart_status || 'pending';
    const dataStatusReason = (staff as any).data_status_reason;
    const chartDenialReason = (staff as any).chart_denial_reason;
    const dataStatusNote = (staff as any).data_status_note;
    const chartStatusNote = (staff as any).chart_status_note;
    const displayName = getDisplayName(staff);

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
                            <Link href={`/staff/edit/${staff.id}/${staff.slug}`}>
                                <Button icon={<EditOutlined />}>Edit Staff</Button>
                            </Link>
                            <Link href={`/system/duplicates?entity=staff&search=${encodeURIComponent(displayName)}`}>
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
                    <span>Staff Info</span>
                </span>
            ),
            children: (
                <div className="space-y-6">
                    <Card
                        title="Basic Information"
                        extra={
                            <Link href={`/staff/edit/${staff.id}/${staff.slug}`}>
                                <Button icon={<EditOutlined />}>Edit</Button>
                            </Link>
                        }
                    >
                        <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
                            <Descriptions.Item label="ID">{staff.id}</Descriptions.Item>
                            <Descriptions.Item label="Slug">{staff.slug || 'N/A'}</Descriptions.Item>
                            <Descriptions.Item label="First Name">{staff.first_name || 'N/A'}</Descriptions.Item>
                            <Descriptions.Item label="Last Name">{staff.last_name || 'N/A'}</Descriptions.Item>
                            <Descriptions.Item label="On-Air Name">{staff.on_air_name || 'N/A'}</Descriptions.Item>
                            <Descriptions.Item label="Position">{staff.position || 'N/A'}</Descriptions.Item>
                            <Descriptions.Item label="Email">
                                {staff.email ? (
                                    <a href={`mailto:${staff.email}`}>{staff.email}</a>
                                ) : 'N/A'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Show Name">{staff.show_name || 'N/A'}</Descriptions.Item>
                            <Descriptions.Item label="Radio Station" span={2}>
                                {staff.station ? (
                                    <Link href={`/system/validation/radio-station/${staff.station.id}/${staff.station.slug}`}>
                                        <Tag color="blue">{staff.station.name}</Tag>
                                    </Link>
                                ) : (
                                    <Text type="secondary">No station assigned</Text>
                                )}
                            </Descriptions.Item>
                            <Descriptions.Item label="Has Playlist">
                                {staff.has_playlist ? <Tag color="green">Yes</Tag> : <Tag>No</Tag>}
                            </Descriptions.Item>
                            <Descriptions.Item label="Archived">
                                {staff.archived ? <Tag color="red">Yes</Tag> : <Tag color="green">No</Tag>}
                            </Descriptions.Item>
                        </Descriptions>

                        {staff.bio && (
                            <>
                                <Divider>Bio</Divider>
                                <div
                                    className="prose max-w-none"
                                    dangerouslySetInnerHTML={{ __html: staff.bio }}
                                />
                            </>
                        )}

                        {staff.show_description && (
                            <>
                                <Divider>Show Description</Divider>
                                <div
                                    className="prose max-w-none"
                                    dangerouslySetInnerHTML={{ __html: staff.show_description }}
                                />
                            </>
                        )}
                    </Card>

                    <Card title="Sub-Genres">
                        <Space wrap>
                            {staff.sub_genres?.map(sg => (
                                <Tag key={sg.id} color="purple">{sg.name}</Tag>
                            ))}
                            {(!staff.sub_genres || staff.sub_genres.length === 0) && (
                                <Text type="secondary">No sub-genres assigned</Text>
                            )}
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
                        <Avatar
                            size={64}
                            icon={<UserOutlined />}
                            src={staff.images?.[0]?.thumbname || staff.images?.[0]?.filename || undefined}
                        >
                            {displayName.charAt(0)}
                        </Avatar>
                        <div>
                            <Title level={4} style={{ margin: 0 }}>{displayName}</Title>
                            {staff.position && (
                                <Text type="secondary">{staff.position}</Text>
                            )}
                            <div className="mt-1">
                                {staff.station && (
                                    <Tag color="blue">{staff.station.name}</Tag>
                                )}
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
                        <Link href={`/staff/view/${staff.id}/${staff.slug}`}>
                            <Button icon={<EyeOutlined />}>View</Button>
                        </Link>
                        <Link href={`/staff/edit/${staff.id}/${staff.slug}`}>
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
