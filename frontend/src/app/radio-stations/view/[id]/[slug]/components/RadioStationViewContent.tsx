'use client'

import {
    EditOutlined,
    InfoCircleOutlined,
    SettingOutlined,
    ToolOutlined,
    WarningOutlined,
} from '@ant-design/icons';
import {App, Button, Card, Col, Descriptions, Row, Space, Tabs, Tag, Typography} from 'antd';
import Link from 'next/link';
import {use, useEffect, useState} from 'react';

import LoadingSpinner from '@/components/common/feedback/LoadingSpinner';
import {useNavigationContext} from '@/hooks/useNavigationContext';
import {fetchRadioStationById} from '@/lib/api/radio-stations';
import {ActiveStatusTag, StatusTag} from '@/lib/utils/status';
import type {RadioStationResponse} from '@/types/api';

const {Title, Text} = Typography;

function EmptyFieldTag() {
    return (
        <Tag icon={<WarningOutlined/>} color="warning">
            Empty
        </Tag>
    );
}

interface RadioStationViewContentProps {
    params: Promise<{ id: string; slug: string }>;
}

export default function RadioStationViewContent({params}: RadioStationViewContentProps) {
    const resolvedParams = use(params);
    const [station, setStation] = useState<RadioStationResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const {message} = App.useApp();
    const nav = useNavigationContext('radio-stations');

    useEffect(() => {
        const loadStation = async () => {
            try {
                setLoading(true);
                const data = await fetchRadioStationById(parseInt(resolvedParams.id));
                setStation(data);
            } catch (err) {
                console.error('Error loading radio station:', err);
                message.error('Failed to load radio station details');
            } finally {
                setLoading(false);
            }
        };

        loadStation();
    }, [resolvedParams.id, message]);

    if (loading) {
        return <LoadingSpinner className="min-h-screen"/>;
    }

    if (!station) {
        return (
            <Card className="m-6">
                <div className="text-center text-red-500">
                    Radio station not found
                </div>
            </Card>
        );
    }

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
                    <Card title="Station Information" size="small">
                        <Descriptions column={2} bordered>
                            <Descriptions.Item label="Name">
                                {station.name}
                            </Descriptions.Item>
                            <Descriptions.Item label="Slug">
                                {station.slug || <EmptyFieldTag/>}
                            </Descriptions.Item>
                            <Descriptions.Item label="Station Type">
                                <Tag color={station.station_type === 'terrestrial' ? 'blue' : 'purple'}>
                                    {station.station_type === 'terrestrial' ? 'Terrestrial' : 'Internet'}
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Influence">
                                {station.influence}
                            </Descriptions.Item>
                            <Descriptions.Item label="Info" span={2}>
                                {station.info || <EmptyFieldTag/>}
                            </Descriptions.Item>
                        </Descriptions>
                    </Card>
                </div>
            ),
        },
        {
            key: 'settings',
            label: (
                <span className="flex items-center gap-1">
                    <SettingOutlined/>
                    <span>Settings</span>
                </span>
            ),
            children: (
                <Card title="Station Settings" size="small">
                    <Descriptions column={2} bordered>
                        <Descriptions.Item label="Active">
                            <ActiveStatusTag active={station.active}/>
                        </Descriptions.Item>
                        <Descriptions.Item label="Automatic Updates">
                            <Tag color={station.automatic ? 'green' : 'default'}>
                                {station.automatic ? 'Yes' : 'No'}
                            </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="No Show">
                            <Tag color={station.no_show ? 'red' : 'default'}>
                                {station.no_show ? 'Yes' : 'No'}
                            </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Imported From File">
                            <Tag color={station.imported_from_file ? 'orange' : 'default'}>
                                {station.imported_from_file ? 'Yes' : 'No'}
                            </Tag>
                        </Descriptions.Item>
                    </Descriptions>
                </Card>
            ),
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
                                <Tag color={station.verified ? 'success' : 'error'}>
                                    {station.verified ? 'Yes' : 'No'}
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Verified By">
                                {station.verified_by ?? <EmptyFieldTag/>}
                            </Descriptions.Item>
                            <Descriptions.Item label="Approved">
                                <Tag color={station.approved ? 'success' : 'error'}>
                                    {station.approved ? 'Yes' : 'No'}
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Approved By">
                                {station.approved_by ?? <EmptyFieldTag/>}
                            </Descriptions.Item>
                            <Descriptions.Item label="Created At" span={1}>
                                {new Date(station.created_at).toLocaleString()}
                            </Descriptions.Item>
                            <Descriptions.Item label="Updated At" span={1}>
                                {new Date(station.updated_at).toLocaleString()}
                            </Descriptions.Item>
                        </Descriptions>
                    </Card>
                </div>
            ),
        },
    ];

    return (
        <div>
            <Card className="mb-6">
                <div className="flex flex-wrap items-start gap-6">
                    <div
                        className="w-32 h-32 rounded-lg bg-gray-200 shadow-sm flex items-center justify-center overflow-hidden">
                        <span className="text-4xl font-semibold text-gray-400">
                            {station.name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                    </div>

                    <div className="flex-1">
                        <div className="flex items-start justify-between flex-wrap gap-4">
                            <div>
                                <Title level={2} className="!mb-2">{station.name}</Title>
                                <Space size="middle" wrap>
                                    <Tag color={station.station_type === 'terrestrial' ? 'blue' : 'purple'}>
                                        {station.station_type === 'terrestrial' ? 'Terrestrial' : 'Internet'}
                                    </Tag>
                                    <ActiveStatusTag active={station.active}/>
                                </Space>
                            </div>
                            <Space>
                                <Link href={nav.createContextualHref(`/radio-stations/edit/${station.id}/${station.slug}`)}>
                                    <Button
                                        type="primary"
                                        icon={<EditOutlined/>}
                                    >
                                        Edit Station
                                    </Button>
                                </Link>
                                <StatusTag verified={station.verified} approved={station.approved}/>
                            </Space>
                        </div>
                    </div>
                </div>
            </Card>

            <Card>
                <Tabs
                    defaultActiveKey="about"
                    items={items}
                    size="large"
                    className="station-profile-tabs"
                />
            </Card>

            <style jsx global>{`
                .station-profile-tabs .ant-tabs-nav {
                    margin-bottom: 24px;
                }

                .station-profile-tabs .ant-tabs-tab {
                    padding: 12px 0;
                    font-size: 16px;
                }

                .station-profile-tabs .ant-tabs-tab + .ant-tabs-tab {
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
