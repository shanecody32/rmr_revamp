'use client'

import {SaveOutlined} from '@ant-design/icons';
import {App, Button, Card, Form, Input, Select, Space, Switch, Tabs} from 'antd';
import {useRouter} from 'next/navigation';
import {useEffect, useState} from 'react';

import LoadingSpinner from '@/components/common/feedback/LoadingSpinner';
import {fetchRadioStationById, updateRadioStation} from '@/lib/api/radio-stations';
import type {RadioStationResponse} from '@/types/api';

const {TextArea} = Input;

interface RadioStationEditContentProps {
    id: string;
    slug: string;
}

export default function RadioStationEditContent({id}: RadioStationEditContentProps) {
    const [form] = Form.useForm();
    const [station, setStation] = useState<RadioStationResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const {message} = App.useApp();
    const router = useRouter();

    useEffect(() => {
        const loadStation = async () => {
            try {
                setLoading(true);
                const data = await fetchRadioStationById(parseInt(id));
                setStation(data);
                form.setFieldsValue(data);
            } catch (err) {
                console.error('Error loading radio station:', err);
                message.error('Failed to load radio station');
            } finally {
                setLoading(false);
            }
        };

        loadStation();
    }, [id, form, message]);

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);
            const updated = await updateRadioStation(parseInt(id), values);
            message.success('Radio station updated successfully');
            setStation(updated);
            router.push(`/radio-stations/view/${updated.id}/${updated.slug}`);
        } catch (err: any) {
            if (err?.errorFields) return; // form validation error
            console.error('Error updating radio station:', err);
            message.error('Failed to update radio station');
        } finally {
            setSaving(false);
        }
    };

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

    const tabItems = [
        {
            key: 'basic',
            label: 'Basic Info',
            children: (
                <div className="space-y-6">
                    <Card title="Station Information" size="small">
                        <Form.Item
                            name="name"
                            label="Station Name"
                            rules={[{required: true, message: 'Please enter the station name'}]}
                        >
                            <Input/>
                        </Form.Item>
                        <Form.Item
                            name="station_type"
                            label="Station Type"
                            rules={[{required: true, message: 'Please select the station type'}]}
                        >
                            <Select
                                options={[
                                    {value: 'terrestrial', label: 'Terrestrial'},
                                    {value: 'internet', label: 'Internet'},
                                ]}
                            />
                        </Form.Item>
                        <Form.Item name="info" label="Info">
                            <TextArea rows={4}/>
                        </Form.Item>
                        <Form.Item name="influence" label="Influence">
                            <Input type="number"/>
                        </Form.Item>
                    </Card>
                </div>
            ),
        },
        {
            key: 'settings',
            label: 'Settings',
            children: (
                <Card title="Station Settings" size="small">
                    <Form.Item name="active" label="Active" valuePropName="checked">
                        <Switch/>
                    </Form.Item>
                    <Form.Item name="automatic" label="Automatic Updates" valuePropName="checked">
                        <Switch/>
                    </Form.Item>
                    <Form.Item name="no_show" label="No Show" valuePropName="checked">
                        <Switch/>
                    </Form.Item>
                    <Form.Item name="imported_from_file" label="Imported From File" valuePropName="checked">
                        <Switch/>
                    </Form.Item>
                </Card>
            ),
        },
        {
            key: 'admin',
            label: 'Admin',
            children: (
                <Card title="Status" size="small">
                    <Form.Item name="verified" label="Verified" valuePropName="checked">
                        <Switch/>
                    </Form.Item>
                    <Form.Item name="approved" label="Approved" valuePropName="checked">
                        <Switch/>
                    </Form.Item>
                </Card>
            ),
        },
    ];

    return (
        <div>
            <Form
                form={form}
                layout="vertical"
                initialValues={station}
            >
                <Card className="mb-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold">
                            Editing: {station.name}
                        </h2>
                        <Space>
                            <Button onClick={() => router.back()}>
                                Cancel
                            </Button>
                            <Button
                                type="primary"
                                icon={<SaveOutlined/>}
                                onClick={handleSave}
                                loading={saving}
                            >
                                Save Changes
                            </Button>
                        </Space>
                    </div>
                </Card>

                <Card>
                    <Tabs
                        defaultActiveKey="basic"
                        items={tabItems}
                        size="large"
                    />
                </Card>
            </Form>
        </div>
    );
}
