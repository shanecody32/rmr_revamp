'use client'

import {EditOutlined, SearchOutlined} from '@ant-design/icons';
import {App, Button, Card, Col, Descriptions, Row, Space, Table, Typography} from 'antd';
import Link from 'next/link';
import {use, useEffect, useState} from 'react';

import LoadingSpinner from '@/components/common/feedback/LoadingSpinner';
import {fetchLabelById} from '@/lib/api/labels';
import {formatDate} from '@/lib/utils';
import type {LabelResponse} from '@/types/api/labels';

const {Title, Text} = Typography;

interface LabelViewContentProps {
    params: Promise<{id: string; slug: string}>;
}

export default function LabelViewContent({params}: LabelViewContentProps) {
    const resolvedParams = use(params);
    const {message} = App.useApp();
    const [label, setLabel] = useState<LabelResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadLabel = async () => {
            try {
                setLoading(true);
                const data = await fetchLabelById(parseInt(resolvedParams.id));
                setLabel(data);
            } catch (error) {
                console.error('Error loading label:', error);
                message.error('Failed to load label');
            } finally {
                setLoading(false);
            }
        };

        loadLabel();
    }, [resolvedParams.id, message]);

    if (loading) {
        return <LoadingSpinner className="min-h-screen" />;
    }

    if (!label) {
        return (
            <div className="p-6">
                <Text type="danger">Label not found</Text>
            </div>
        );
    }

    return (
        <div className="p-6">
            <Row gutter={[24, 24]}>
                <Col xs={24}>
                    <Card>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <Title level={3} className="!mb-1">{label.name}</Title>
                                <Text type="secondary">ID: {label.id}</Text>
                            </div>
                            <Space>
                                <Link href={`/labels/edit/${label.id}/${label.slug}`}>
                                    <Button type="primary" icon={<EditOutlined />}>
                                        Edit
                                    </Button>
                                </Link>
                            </Space>
                        </div>

                        <Descriptions bordered column={{xs: 1, sm: 2}} size="small">
                            <Descriptions.Item label="Name">{label.name}</Descriptions.Item>
                            <Descriptions.Item label="Slug">{label.slug}</Descriptions.Item>
                            <Descriptions.Item label="Albums">{label.album_count}</Descriptions.Item>
                            <Descriptions.Item label="Created">{formatDate(label.created_at)}</Descriptions.Item>
                            <Descriptions.Item label="Updated">{formatDate(label.updated_at)}</Descriptions.Item>
                        </Descriptions>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}
