'use client'

import {App, Form, Input, Modal} from 'antd';
import {useState} from 'react';

import {createStaff} from '@/lib/api/staff';
import type {StaffResponse} from '@/types/api/staff';

interface AddStaffModalProps {
    open: boolean;
    onCancel: () => void;
    onSuccess: () => void;
    defaultStationId?: number;
}

export default function AddStaffModal({
    open,
    onCancel,
    onSuccess,
    defaultStationId,
}: AddStaffModalProps) {
    const [form] = Form.useForm();
    const {message} = App.useApp();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);

            const staffData: Partial<StaffResponse> = {
                first_name: values.first_name || null,
                last_name: values.last_name || null,
                on_air_name: values.on_air_name || null,
                email: values.email || null,
                position: values.position || null,
                radio_station_id: values.radio_station_id || defaultStationId || null,
            };

            await createStaff(staffData);
            form.resetFields();
            onSuccess();
        } catch (error: any) {
            if (error.errorFields) {
                // Form validation error
                return;
            }
            console.error('Error creating staff member:', error);
            message.error('Failed to create staff member');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        form.resetFields();
        onCancel();
    };

    return (
        <Modal
            title="Add Staff Member"
            open={open}
            onOk={handleSubmit}
            onCancel={handleCancel}
            confirmLoading={loading}
            okText="Create"
            width={500}
        >
            <Form
                form={form}
                layout="vertical"
                initialValues={{
                    radio_station_id: defaultStationId,
                }}
            >
                <Form.Item
                    name="first_name"
                    label="First Name"
                >
                    <Input placeholder="Enter first name"/>
                </Form.Item>

                <Form.Item
                    name="last_name"
                    label="Last Name"
                >
                    <Input placeholder="Enter last name"/>
                </Form.Item>

                <Form.Item
                    name="on_air_name"
                    label="On-Air Name"
                >
                    <Input placeholder="Enter on-air name (optional)"/>
                </Form.Item>

                <Form.Item
                    name="email"
                    label="Email"
                    rules={[
                        {type: 'email', message: 'Please enter a valid email'},
                    ]}
                >
                    <Input placeholder="Enter email"/>
                </Form.Item>

                <Form.Item
                    name="position"
                    label="Position"
                >
                    <Input placeholder="Enter position (e.g., DJ, Host)"/>
                </Form.Item>

                <Form.Item
                    name="radio_station_id"
                    label="Radio Station ID"
                >
                    <Input type="number" placeholder="Enter station ID"/>
                </Form.Item>
            </Form>
        </Modal>
    );
}
