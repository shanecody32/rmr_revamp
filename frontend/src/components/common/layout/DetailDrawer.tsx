'use client'

import {Descriptions, Drawer, Space} from 'antd';

import {formatDate} from '@/lib/utils';
import {ActiveStatusTag, StatusTag} from '@/lib/utils/status';
import type {BaseEntity} from '@/types/api/common';

interface DetailDrawerProps<T extends BaseEntity> {
    open: boolean;
    onClose: () => void;
    data: T | null;
    title: string;
    extraFields?: {
        label: string;
        key: keyof T;
        render?: (value: any) => React.ReactNode;
    }[];
}

export default function DetailDrawer<T extends BaseEntity>({
                                                               open,
                                                               onClose,
                                                               data,
                                                               title,
                                                               extraFields = []
                                                           }: DetailDrawerProps<T>) {
    if (!data) return null;

    return (
        <Drawer
            title={title}
            placement="right"
            size={600}
            onClose={onClose}
            open={open}
        >
            <Descriptions layout="vertical" column={1}>
                <Descriptions.Item label="Name">
                    {data.name}
                </Descriptions.Item>

                {extraFields.map(field => (
                    <Descriptions.Item key={field.key as string} label={field.label}>
                        {field.render
                            ? field.render(data[field.key])
                            : data[field.key]?.toString() || '-'}
                    </Descriptions.Item>
                ))}

                <Descriptions.Item label="Status">
                    <Space>
                        {'active' in data ? (
                            <ActiveStatusTag active={data.active as boolean}/>
                        ) : (
                            <StatusTag
                                verified={data.verified || false}
                                approved={data.approved || false}
                            />
                        )}
                    </Space>
                </Descriptions.Item>

                <Descriptions.Item label="Created At">
                    {formatDate(data.created_at)}
                </Descriptions.Item>

                <Descriptions.Item label="Updated At">
                    {formatDate(data.updated_at)}
                </Descriptions.Item>
            </Descriptions>
        </Drawer>
    );
}
