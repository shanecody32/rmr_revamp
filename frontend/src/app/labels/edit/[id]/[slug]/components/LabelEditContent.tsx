'use client'

import {App, Button, Card, Col, Form, Input, Row, Space, Typography} from 'antd';
import {useRouter} from 'next/navigation';
import {useEffect, useState} from 'react';

import LoadingSpinner from '@/components/common/feedback/LoadingSpinner';
import {fetchLabelById, updateLabel} from '@/lib/api/labels';
import {formatDate} from '@/lib/utils';
import type {LabelResponse} from '@/types/api/labels';

const {Text} = Typography;

interface LabelEditContentProps {
    id: string;
    slug: string;
}

export default function LabelEditContent({id}: LabelEditContentProps) {
    const router = useRouter();
    const {message} = App.useApp();
    const [form] = Form.useForm();
    const [label, setLabel] = useState<LabelResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const loadLabel = async () => {
            try {
                setLoading(true);
                const data = await fetchLabelById(parseInt(id));
                setLabel(data);
                form.setFieldsValue({
                    name: data.name,
                });
            } catch (error) {
                console.error('Error loading label:', error);
                message.error('Failed to load label');
            } finally {
                setLoading(false);
            }
        };

        loadLabel();
    }, [id, form, message]);

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);

            const updated = await updateLabel(parseInt(id), {
                name: values.name,
            });

            setLabel(updated);
            message.success('Label updated successfully');

            // Navigate to the new slug if it changed
            if (updated.slug !== label?.slug) {
                router.replace(`/labels/edit/${updated.id}/${updated.slug}`);
            }
        } catch (error) {
            if (error && typeof error === 'object' && 'errorFields' in error) return;
            console.error('Error updating label:', error);
            message.error('Failed to update label');
        } finally {
            setSaving(false);
        }
    };

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
                <Col xs={24} lg={16}>
                    <Card title="Label Information">
                        <Form
                            form={form}
                            layout="vertical"
                            onFinish={handleSave}
                        >
                            <Form.Item
                                name="name"
                                label="Name"
                                rules={[{required: true, message: 'Please enter a label name'}]}
                            >
                                <Input />
                            </Form.Item>

                            <Form.Item>
                                <Space>
                                    <Button type="primary" htmlType="submit" loading={saving}>
                                        Save Changes
                                    </Button>
                                    <Button onClick={() => router.push(`/labels/view/${label.id}/${label.slug}`)}>
                                        Cancel
                                    </Button>
                                </Space>
                            </Form.Item>
                        </Form>
                    </Card>
                </Col>

                <Col xs={24} lg={8}>
                    <Card title="Label Info" size="small">
                        <div className="space-y-2">
                            <div>
                                <Text type="secondary">ID:</Text>
                                <Text className="ml-2">{label.id}</Text>
                            </div>
                            <div>
                                <Text type="secondary">Slug:</Text>
                                <Text className="ml-2">{label.slug}</Text>
                            </div>
                            <div>
                                <Text type="secondary">Albums:</Text>
                                <Text className="ml-2">{label.album_count}</Text>
                            </div>
                            <div>
                                <Text type="secondary">Created:</Text>
                                <Text className="ml-2">{formatDate(label.created_at)}</Text>
                            </div>
                            <div>
                                <Text type="secondary">Updated:</Text>
                                <Text className="ml-2">{formatDate(label.updated_at)}</Text>
                            </div>
                        </div>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}
