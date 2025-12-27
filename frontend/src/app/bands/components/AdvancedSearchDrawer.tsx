'use client'

import {Button, Card, Drawer, Form, Select} from 'antd';
import {useEffect, useRef, useState} from 'react';

import GenreFilter from '@/components/forms/filters/GenreFilter';
import LocationFilter from '@/components/forms/filters/LocationFilter';
import type {NameFilterType} from '@/types/api/common';

interface AdvancedSearchDrawerProps {
    open: boolean;
    onClose: () => void;
    onSearch: (filters: Record<string, any>) => void;
    filterType: NameFilterType;
    onFilterTypeChange: (type: NameFilterType) => void;
    filters: Record<string, any>;
}

export default function AdvancedSearchDrawer({
                                                 open,
                                                 onClose,
                                                 onSearch,
                                                 filterType,
                                                 onFilterTypeChange,
                                                 filters
                                             }: AdvancedSearchDrawerProps) {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const mounted = useRef(true);

    // Set mounted ref on mount and cleanup on unmount
    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    // Initialize form with saved filters when drawer opens
    useEffect(() => {
        // Only proceed if component is mounted and form is valid
        if (!mounted.current || !form) return;

        if (open) {
            // Wrap in a setTimeout to ensure form is connected
            setTimeout(() => {
                if (!mounted.current || !form) return;

                form.setFieldsValue({
                    name_filter_type: filterType,
                    ...filters
                });
            }, 0);
        }
    }, [open, form, filterType, filters]);

    // Watch for field changes using Form.useWatch
    Form.useWatch('genre_id', form);
    Form.useWatch('sub_genre_id', form);

    // Handle field dependencies
    useEffect(() => {
        // Only proceed if component is mounted and form is valid
        if (!mounted.current || !form) return;

        // Wrap in a setTimeout to ensure form is connected
        setTimeout(() => {
            if (!mounted.current || !form) return;

            const values = form.getFieldsValue(['genre_id', 'sub_genre_id']);

            if (values.genre_id && values.sub_genre_id) {
                if (values.genre_id) {
                    form.setFieldValue('sub_genre_id', undefined);
                } else if (values.sub_genre_id) {
                    form.setFieldValue('genre_id', undefined);
                }
            }
        }, 0);
    }, [form]);

    const handleSubmit = async () => {
        if (!mounted.current) return;

        try {
            setLoading(true);
            const values = await form.validateFields();

            // Remove undefined and empty values
            const cleanValues = Object.fromEntries(
                Object.entries(values).filter(([_, value]) => value !== undefined && value !== '')
            );

            // Update filter type if changed
            if (values.name_filter_type) {
                onFilterTypeChange(values.name_filter_type);
            }

            // Call onSearch with cleaned values
            onSearch(cleanValues);
            onClose();
        } catch (error) {
            console.error('Form validation failed:', error);
        } finally {
            if (mounted.current) {
                setLoading(false);
            }
        }
    };

    const handleReset = () => {
        if (!mounted.current) return;

        form.resetFields();
        onFilterTypeChange('startswith');
        onSearch({});
        onClose();
    };

    return (
        <Drawer
            title="Advanced Search"
            placement="right"
            size={400}
            open={open}
            onClose={onClose}
            destroyOnClose={false}
            className="advanced-search-drawer"
            footer={
                <div className="flex justify-end space-x-2 pt-4 border-t">
                    <Button onClick={handleReset}>
                        Reset All
                    </Button>
                    <Button
                        type="primary"
                        onClick={handleSubmit}
                        loading={loading}
                    >
                        Apply Filters
                    </Button>
                </div>
            }
        >
            <Form
                form={form}
                layout="vertical"
                preserve={true}
                onFinish={handleSubmit}
                initialValues={{
                    name_filter_type: filterType,
                    ...filters
                }}
                className="space-y-6"
            >
                <Card title="Search Options" size="small">
                    <Form.Item name="name_filter_type" label="Name Match Type">
                        <Select
                            options={[
                                {value: 'startswith', label: 'Starts With'},
                                {value: 'contains', label: 'Contains'},
                                {value: 'endswith', label: 'Ends With'},
                                {value: 'exact', label: 'Exact Match'},
                            ]}
                        />
                    </Form.Item>
                </Card>

                <Card title="Genre" size="small">
                    <GenreFilter form={form}/>
                </Card>

                <Card title="Location" size="small">
                    <LocationFilter form={form}/>
                </Card>
            </Form>

            <style jsx global>{`
                .advanced-search-drawer .ant-drawer-body {
                    padding: 16px;
                    background-color: #f5f5f5;
                }

                .advanced-search-drawer .ant-drawer-footer {
                    padding: 16px;
                    background-color: #fff;
                    border-top: 1px solid #f0f0f0;
                }

                .advanced-search-drawer .ant-card {
                    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
                }

                .advanced-search-drawer .ant-card-head {
                    min-height: 40px;
                    padding: 8px 16px;
                    font-size: 14px;
                    border-bottom: 1px solid #f0f0f0;
                }

                .advanced-search-drawer .ant-card-body {
                    padding: 16px;
                }

                .advanced-search-drawer .ant-form-item {
                    margin-bottom: 16px;
                }

                .advanced-search-drawer .ant-form-item:last-child {
                    margin-bottom: 0;
                }

                .advanced-search-drawer .ant-select {
                    width: 100%;
                }
            `}</style>
        </Drawer>
    );
}
