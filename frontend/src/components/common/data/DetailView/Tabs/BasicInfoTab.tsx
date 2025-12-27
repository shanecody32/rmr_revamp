'use client'

import {CheckOutlined, CloseOutlined, EditOutlined} from '@ant-design/icons';
import {Button, Descriptions, Input, Space, Tag, Typography} from 'antd';
import {useState} from 'react';

import {formatDate} from '@/lib/utils';
import {StatusTag} from '@/lib/utils/status';
import type {BandResponse} from '@/types/api/bands';
import type {BaseEntity} from '@/types/api/common';

const {Text} = Typography;

interface EditableFieldProps {
    value: string;
    onSave: (value: string) => Promise<void>;
}

function EditableField({value, onSave}: EditableFieldProps) {
    const [editing, setEditing] = useState(false);
    const [editValue, setEditValue] = useState(value);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (editValue === value) {
            setEditing(false);
            return;
        }

        try {
            setSaving(true);
            await onSave(editValue);
            setEditing(false);
        } catch (error) {
            // Reset on error
            setEditValue(value);
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setEditValue(value);
        setEditing(false);
    };

    if (editing) {
        return (
            <div className="flex items-center gap-1">
                <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onPressEnter={handleSave}
                    disabled={saving}
                    autoFocus
                    style={{width: 'auto', minWidth: '200px'}}
                />
                <Button
                    type="primary"
                    icon={<CheckOutlined/>}
                    onClick={handleSave}
                    loading={saving}
                    size="small"
                />
                <Button
                    icon={<CloseOutlined/>}
                    onClick={handleCancel}
                    disabled={saving}
                    size="small"
                />
            </div>
        );
    }

    return (
        <div className="group flex items-center gap-2">
            <Text>{value || '-'}</Text>
            <Button
                type="text"
                size="small"
                icon={<EditOutlined/>}
                onClick={() => setEditing(true)}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
            />
        </div>
    );
}

interface BasicInfoTabProps<T extends BaseEntity> {
    data: T;
    extraFields?: {
        label: string;
        key: keyof T;
        render?: (value: T[keyof T], record: T) => React.ReactNode;
        span?: number;
        editable?: boolean;
    }[];
    onSave?: (values: Partial<T>) => Promise<void>;
}

export default function BasicInfoTab<T extends BaseEntity>({
                                                               data,
                                                               extraFields = [],
                                                               onSave
                                                           }: BasicInfoTabProps<T>) {
    if (!data) return null;

    // Type guard to check if entity is a band
    const isBand = (entity: BaseEntity): entity is BandResponse => {
        return 'website' in entity;
    };

    const handleFieldSave = async (key: keyof T, value: string) => {
        if (!onSave) return;
        await onSave({[key]: value} as Partial<T>);
    };

    return (
        <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="ID" span={1}>
                {data.id}
            </Descriptions.Item>

            <Descriptions.Item label="Status" span={1}>
                <Space>
                    <StatusTag
                        verified={data.verified || false}
                        approved={data.approved || false}
                    />
                </Space>
            </Descriptions.Item>

            <Descriptions.Item label="Name" span={2}>
                <EditableField
                    value={data.name}
                    onSave={(value) => handleFieldSave('name', value)}
                />
            </Descriptions.Item>

            {isBand(data) && (
                <>
                    <Descriptions.Item label="Location" span={2}>
                        <Space>
                            {data.country?.name && <span>{data.country.name}</span>}
                            {data.state?.name && <span>• {data.state.name}</span>}
                            {data.city?.name && <span>• {data.city.name}</span>}
                        </Space>
                    </Descriptions.Item>
                    <Descriptions.Item label="Genres" span={2}>
                        <Space wrap>
                            {data.genres?.map(genre => (
                                <Tag key={`genre-${genre.id}`} color="blue">
                                    {genre.name || '-'}
                                </Tag>
                            ))}
                        </Space>
                    </Descriptions.Item>
                    <Descriptions.Item label="Sub-Genres" span={2}>
                        <Space wrap>
                            {data.sub_genres?.map(subGenre => (
                                <Tag key={`subgenre-${subGenre.id}`} color="purple">
                                    {subGenre.name || '-'}
                                </Tag>
                            ))}
                        </Space>
                    </Descriptions.Item>
                </>
            )}

            {extraFields.map(field => (
                <Descriptions.Item
                    key={field.key as string}
                    label={field.label}
                    span={field.span || 1}
                >
                    {field.editable ? (
                        <EditableField
                            value={(data[field.key] as string) || ''}
                            onSave={(value) => handleFieldSave(field.key, value)}
                        />
                    ) : (
                        field.render
                            ? field.render(data[field.key], data)
                            : data[field.key]?.toString() || '-'
                    )}
                </Descriptions.Item>
            ))}

            <Descriptions.Item label="Created" span={1}>
                {formatDate(data.created_at)}
            </Descriptions.Item>

            <Descriptions.Item label="Last Updated" span={1}>
                {formatDate(data.updated_at)}
            </Descriptions.Item>
        </Descriptions>
    );
}
