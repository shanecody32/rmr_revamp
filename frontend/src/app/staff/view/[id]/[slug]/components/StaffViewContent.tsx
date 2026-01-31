'use client'

import {
    CloseOutlined,
    EditOutlined,
    EnvironmentOutlined,
    ExpandOutlined,
    GlobalOutlined,
    InfoCircleOutlined,
    LinkOutlined,
    MailOutlined,
    PhoneOutlined,
    SwapOutlined,
    ToolOutlined,
    UserOutlined,
    WarningOutlined,
} from '@ant-design/icons';
import {Alert, App, Button, Card, Col, Descriptions, Row, Space, Tabs, Tag, Typography} from 'antd';
import Image from 'next/image';
import Link from 'next/link';
import {use, useEffect, useState} from 'react';

import DOMPurify from 'dompurify';
import LoadingSpinner from '@/components/common/feedback/LoadingSpinner';
import {useNavigationContext} from '@/hooks/useNavigationContext';
import {fetchStaffById} from '@/lib/api/staff';
import {buildImageUrl} from '@/lib/utils/media';
import {StatusTag} from '@/lib/utils/status';
import type {StaffDetailView} from '@/types/api/staff';
import {getStaffDisplayName, isStaffArchived, isStaffTransferSource, isStaffTransferTarget} from '@/types/api/staff';

const {Title, Text} = Typography;

function EmptyFieldTag() {
    return (
        <Tag icon={<WarningOutlined/>} color="warning">
            Empty
        </Tag>
    );
}

interface ImagePreviewProps {
    src: string;
    alt: string;
    onClose: () => void;
}

function ImagePreview({src, alt, onClose}: ImagePreviewProps) {
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div className="relative max-w-7xl max-h-[90vh] w-full">
                <Image
                    src={src}
                    alt={alt}
                    className="max-w-full max-h-[90vh] object-contain mx-auto"
                    onClick={(e) => e.stopPropagation()}
                    width={1200}
                    height={800}
                    style={{width: 'auto', height: 'auto'}}
                    priority
                />
                <Button
                    type="text"
                    icon={<CloseOutlined/>}
                    className="absolute top-4 right-4 text-white hover:text-gray-300"
                    onClick={onClose}
                />
            </div>
        </div>
    );
}

interface StaffViewContentProps {
    params: Promise<{ id: string; slug: string }>;
}

export default function StaffViewContent({params}: StaffViewContentProps) {
    const resolvedParams = use(params);
    const [staff, setStaff] = useState<StaffDetailView | null>(null);
    const [loading, setLoading] = useState(true);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const {message} = App.useApp();
    const nav = useNavigationContext('staff');

    useEffect(() => {
        const loadStaff = async () => {
            try {
                setLoading(true);
                const data = await fetchStaffById(parseInt(resolvedParams.id), {
                    include_images: true,
                    include_addresses: true,
                    include_links: true,
                    include_phones: true,
                    include_sub_genres: true,
                });
                setStaff(data);
            } catch (err) {
                console.error('Error loading staff member:', err);
                message.error('Failed to load staff member details');
            } finally {
                setLoading(false);
            }
        };

        loadStaff();
    }, [resolvedParams.id, message]);

    if (loading) {
        return <LoadingSpinner className="min-h-screen"/>;
    }

    if (!staff) {
        return (
            <Card className="m-6">
                <div className="text-center text-red-500">
                    Staff member not found
                </div>
            </Card>
        );
    }

    const displayName = getStaffDisplayName(staff);
    const isArchived = isStaffArchived(staff);
    const isTransferSource = isStaffTransferSource(staff);
    const isTransferTarget = isStaffTransferTarget(staff);

    const items = [
        {
            key: 'about',
            label: (
                <span className="flex items-center gap-1">
                    <InfoCircleOutlined/>
                    <span>About</span>
                </span>
            ),
            children: (
                <div className="space-y-8">
                    {/* Staff Images */}
                    <div className="mb-8">
                        <Title level={4} className="mb-4">Photos</Title>
                        <Row gutter={[16, 16]}>
                            {staff.images && staff.images.length > 0 ? (
                                staff.images.map((image) => {
                                    const imageUrl = image.filename
                                        ? buildImageUrl(image.path, image.filename)
                                        : null;
                                    const thumbUrl = image.thumbname
                                        ? buildImageUrl(image.path, image.thumbname)
                                        : null;

                                    if (!imageUrl) return null;

                                    return (
                                        <Col key={image.id} xs={24} sm={12} md={8}>
                                            <div className="relative group overflow-hidden rounded-lg">
                                                <Image
                                                    src={thumbUrl || imageUrl}
                                                    alt={`${displayName} photo`}
                                                    className="w-full aspect-[4/3] object-cover"
                                                    width={400}
                                                    height={300}
                                                    style={{width: '100%', height: 'auto'}}
                                                />
                                                <div
                                                    className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                                                    <Button
                                                        type="primary"
                                                        icon={<ExpandOutlined/>}
                                                        onClick={() => setPreviewImage(imageUrl)}
                                                    >
                                                        View
                                                    </Button>
                                                </div>
                                            </div>
                                        </Col>
                                    );
                                })
                            ) : (
                                <Col span={24}>
                                    <div className="text-center text-gray-500 py-8">
                                        No photos available
                                    </div>
                                </Col>
                            )}
                        </Row>
                    </div>

                    {/* Bio Section */}
                    <div>
                        <Title level={4} className="mb-4">Biography</Title>
                        <Card className="prose max-w-none">
                            {staff.bio ? (
                                <div dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(staff.bio)}}/>
                            ) : (
                                <Text type="secondary" italic>No biography available yet.</Text>
                            )}
                        </Card>
                    </div>

                    {/* Show Information */}
                    {(staff.show_name || staff.show_description) && (
                        <div>
                            <Title level={4} className="mb-4">Show Information</Title>
                            <Card size="small">
                                <div className="space-y-4">
                                    {staff.show_name && (
                                        <div>
                                            <Text strong>Show Name</Text><br/>
                                            <Text>{staff.show_name}</Text>
                                        </div>
                                    )}
                                    {staff.show_description && (
                                        <div>
                                            <Text strong>Show Description</Text><br/>
                                            <div dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(staff.show_description)}}/>
                                        </div>
                                    )}
                                    {(staff.start_time || staff.end_time || staff.days_on) && (
                                        <div>
                                            <Text strong>Schedule</Text><br/>
                                            <Text>
                                                {staff.days_on && `${staff.days_on} `}
                                                {staff.start_time && staff.end_time
                                                    ? `${staff.start_time} - ${staff.end_time}`
                                                    : staff.start_time || staff.end_time || ''}
                                            </Text>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </div>
                    )}

                    {/* Sub-Genres */}
                    <div>
                        <Title level={4} className="mb-4">Sub-Genres</Title>
                        <Card size="small">
                            <Space wrap>
                                {staff.sub_genres && staff.sub_genres.length > 0 ? (
                                    staff.sub_genres.map(subGenre => (
                                        <Tag key={subGenre.id} color="purple" className="text-base py-1 px-3">
                                            {subGenre.name}
                                        </Tag>
                                    ))
                                ) : (
                                    <Text type="secondary" italic>No sub-genres calculated</Text>
                                )}
                            </Space>
                        </Card>
                    </div>
                </div>
            )
        },
        {
            key: 'contact',
            label: (
                <span className="flex items-center gap-1">
                    <PhoneOutlined/>
                    <span>Contact</span>
                </span>
            ),
            children: (
                <div className="space-y-8">
                    {/* Contact Information */}
                    <Card title="Contact Information" size="small">
                        <div className="space-y-4">
                            <div>
                                <Text strong><MailOutlined className="mr-2"/>Email</Text><br/>
                                {staff.email ? (
                                    <a href={`mailto:${staff.email}`}>{staff.email}</a>
                                ) : (
                                    <EmptyFieldTag/>
                                )}
                            </div>
                        </div>
                    </Card>

                    {/* Phone Numbers */}
                    <Card title="Phone Numbers" size="small">
                        {staff.phone_numbers && staff.phone_numbers.length > 0 ? (
                            <div className="space-y-2">
                                {staff.phone_numbers.map((phone) => (
                                    <div key={phone.id} className="flex items-center gap-2">
                                        <PhoneOutlined/>
                                        <Text>{phone.phone}</Text>
                                        {phone.ext && <Text type="secondary">ext. {phone.ext}</Text>}
                                        {phone.type && <Tag>{phone.type}</Tag>}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <Text type="secondary" italic>No phone numbers</Text>
                        )}
                    </Card>

                    {/* Links */}
                    <Card title="Links" size="small">
                        {staff.links && staff.links.length > 0 ? (
                            <div className="space-y-2">
                                {staff.links.map((link) => (
                                    <div key={link.id} className="flex items-center gap-2">
                                        <LinkOutlined/>
                                        <a href={link.link || '#'} target="_blank" rel="noopener noreferrer">
                                            {link.link}
                                        </a>
                                        {link.type && <Tag>{link.type}</Tag>}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <Text type="secondary" italic>No links</Text>
                        )}
                    </Card>

                    {/* Addresses */}
                    <Card title="Addresses" size="small">
                        {staff.addresses && staff.addresses.length > 0 ? (
                            <div className="space-y-4">
                                {staff.addresses.map((address) => (
                                    <div key={address.id} className="border-b pb-4 last:border-b-0 last:pb-0">
                                        <div className="flex items-start gap-2">
                                            <EnvironmentOutlined className="mt-1"/>
                                            <div>
                                                {address.address && <div>{address.address}</div>}
                                                {address.address2 && <div>{address.address2}</div>}
                                                {address.type && <Tag className="mt-1">{address.type}</Tag>}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <Text type="secondary" italic>No addresses</Text>
                        )}
                    </Card>
                </div>
            )
        },
        {
            key: 'admin',
            label: (
                <span className="flex items-center gap-1">
                    <ToolOutlined/>
                    <span>Admin Info</span>
                </span>
            ),
            children: (
                <div className="space-y-8">
                    <Card title="Status Information" size="small">
                        <Descriptions column={2} bordered>
                            <Descriptions.Item label="Verified">
                                <Tag color={staff.verified ? 'success' : 'error'}>
                                    {staff.verified ? 'Yes' : 'No'}
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Approved">
                                <Tag color={staff.approved ? 'success' : 'error'}>
                                    {staff.approved ? 'Yes' : 'No'}
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Has Playlist">
                                <Tag color={staff.has_playlist ? 'success' : 'default'}>
                                    {staff.has_playlist ? 'Yes' : 'No'}
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Archived">
                                <Tag color={isArchived ? 'error' : 'success'}>
                                    {isArchived ? 'Yes' : 'No'}
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Created At" span={1}>
                                {staff.created ? new Date(staff.created).toLocaleString() : '-'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Updated At" span={1}>
                                {staff.modified ? new Date(staff.modified).toLocaleString() : '-'}
                            </Descriptions.Item>
                        </Descriptions>
                    </Card>

                    {isArchived && (
                        <Card title="Archive Information" size="small">
                            <Descriptions column={1} bordered>
                                <Descriptions.Item label="Archived At">
                                    {staff.archived_at ? new Date(staff.archived_at).toLocaleString() : '-'}
                                </Descriptions.Item>
                                <Descriptions.Item label="Archive Reason">
                                    {staff.archived_reason || '-'}
                                </Descriptions.Item>
                            </Descriptions>
                        </Card>
                    )}

                    {(isTransferSource || isTransferTarget) && (
                        <Card title="Transfer Information" size="small">
                            {isTransferSource && staff.transferred_to && (
                                <Alert
                                    type="info"
                                    showIcon
                                    icon={<SwapOutlined/>}
                                    message="Transferred To"
                                    description={
                                        <Link href={`/staff/view/${staff.transferred_to.id}/${staff.slug}`}>
                                            {getStaffDisplayName(staff.transferred_to)}
                                            {staff.transferred_to.station_name && ` at ${staff.transferred_to.station_name}`}
                                        </Link>
                                    }
                                />
                            )}
                            {isTransferTarget && staff.transferred_from && (
                                <Alert
                                    type="info"
                                    showIcon
                                    icon={<SwapOutlined/>}
                                    message="Transferred From"
                                    description={
                                        <Link href={`/staff/view/${staff.transferred_from.id}/${staff.slug}`}>
                                            {getStaffDisplayName(staff.transferred_from)}
                                            {staff.transferred_from.station_name && ` at ${staff.transferred_from.station_name}`}
                                        </Link>
                                    }
                                    className="mt-4"
                                />
                            )}
                        </Card>
                    )}

                    <Card title="Station Information" size="small">
                        <Descriptions column={1} bordered>
                            <Descriptions.Item label="Radio Station">
                                {staff.station ? (
                                    <Space>
                                        <Text>{staff.station.name}</Text>
                                        {staff.station.call_letters && (
                                            <Tag>{staff.station.call_letters}</Tag>
                                        )}
                                    </Space>
                                ) : (
                                    <EmptyFieldTag/>
                                )}
                            </Descriptions.Item>
                            <Descriptions.Item label="Station ID">
                                {staff.radio_station_id || <EmptyFieldTag/>}
                            </Descriptions.Item>
                        </Descriptions>
                    </Card>
                </div>
            )
        }
    ];

    return (
        <div className="max-w-7xl mx-auto">
            {/* Archived Banner */}
            {isArchived && (
                <Alert
                    type="warning"
                    showIcon
                    message="Archived Profile"
                    description={
                        <>
                            This profile was archived
                            {staff.archived_at && ` on ${new Date(staff.archived_at).toLocaleDateString()}`}.
                            {staff.archived_reason && ` Reason: ${staff.archived_reason}`}
                            {isTransferSource && staff.transferred_to && (
                                <>
                                    {' '}
                                    <Link href={`/staff/view/${staff.transferred_to.id}/${staff.slug}`}>
                                        View current profile
                                    </Link>
                                </>
                            )}
                        </>
                    }
                    className="mb-6"
                />
            )}

            {/* Header Section */}
            <Card className="mb-6">
                <div className="flex flex-wrap items-start gap-6">
                    {/* Profile Image */}
                    <div
                        className="w-32 h-32 rounded-lg bg-gray-100 shadow-sm flex items-center justify-center overflow-hidden">
                        {staff.images && staff.images.length > 0 && staff.images[0].thumbname ? (
                            <Image
                                src={buildImageUrl(staff.images[0].path, staff.images[0].thumbname)}
                                alt={displayName}
                                className="w-full h-full object-cover"
                                width={128}
                                height={128}
                            />
                        ) : (
                            <Image
                                src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`}
                                alt={displayName}
                                className="w-full h-full"
                                width={128}
                                height={128}
                            />
                        )}
                    </div>

                    {/* Title and Meta Info */}
                    <div className="flex-1">
                        <div className="flex items-start justify-between flex-wrap gap-4">
                            <div>
                                <Title level={2} className="!mb-2">{displayName}</Title>
                                <Space size="middle" wrap>
                                    {staff.position && (
                                        <Text className="text-gray-600 flex items-center gap-1">
                                            <UserOutlined/>
                                            {staff.position}
                                        </Text>
                                    )}
                                    {staff.station && (
                                        <Text className="text-gray-600 flex items-center gap-1">
                                            <GlobalOutlined/>
                                            {staff.station.name}
                                            {staff.station.call_letters && ` (${staff.station.call_letters})`}
                                        </Text>
                                    )}
                                </Space>
                                <div className="mt-2">
                                    <Space wrap>
                                        {isTransferSource && (
                                            <Tag color="orange" icon={<SwapOutlined/>}>
                                                Transferred
                                            </Tag>
                                        )}
                                        {isTransferTarget && (
                                            <Tag color="blue" icon={<SwapOutlined/>}>
                                                From Transfer
                                            </Tag>
                                        )}
                                        {isArchived && (
                                            <Tag color="gray">Archived</Tag>
                                        )}
                                    </Space>
                                </div>
                            </div>
                            <Space>
                                <Link href={nav.createContextualHref(`/staff/edit/${staff.id}/${staff.slug}`)}>
                                    <Button
                                        type="primary"
                                        icon={<EditOutlined/>}
                                    >
                                        Edit Staff
                                    </Button>
                                </Link>
                                <StatusTag verified={!!staff.verified} approved={!!staff.approved}/>
                            </Space>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Content Tabs */}
            <Card>
                <Tabs
                    defaultActiveKey="about"
                    items={items}
                    size="large"
                    className="staff-profile-tabs"
                />
            </Card>

            {/* Image Preview Modal */}
            {previewImage && (
                <ImagePreview
                    src={previewImage}
                    alt={displayName}
                    onClose={() => setPreviewImage(null)}
                />
            )}

            <style jsx global>{`
                .staff-profile-tabs .ant-tabs-nav {
                    margin-bottom: 24px;
                }

                .staff-profile-tabs .ant-tabs-tab {
                    padding: 12px 0;
                    font-size: 16px;
                }

                .staff-profile-tabs .ant-tabs-tab + .ant-tabs-tab {
                    margin-left: 32px;
                }

                .ant-descriptions-bordered .ant-descriptions-item-label {
                    background-color: #fafafa;
                    width: 200px;
                }
            `}</style>
        </div>
    );
}
