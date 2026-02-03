'use client'

import {CheckCircleOutlined, DownOutlined, EditOutlined, EyeOutlined, LoadingOutlined, SearchOutlined} from '@ant-design/icons';
import {Button, Dropdown, Space} from 'antd';
import type {ColumnType} from 'antd/es/table';
import type {MenuProps} from 'antd';
import Link from 'next/link';

import {formatDate} from '@/lib/utils';
import {StatusTag} from '@/lib/utils/status';

export interface EntityActionColumnConfig<T> {
    routePrefix: string;
    getId: (record: T) => number;
    getSlug: (record: T) => string;
    onVerifyClick?: (record: T) => void;
    onFindComparisons?: (record: T) => void;
    verifyingId?: number | null;
    extraMenuItems?: (record: T) => MenuProps['items'];
    width?: number;
}

export function getEntityActionColumn<T>(config: EntityActionColumnConfig<T>): ColumnType<T> {
    const {
        routePrefix,
        getId,
        getSlug,
        onVerifyClick,
        onFindComparisons,
        verifyingId,
        extraMenuItems,
        width = 250,
    } = config;

    return {
        key: 'actions',
        title: 'Actions',
        fixed: 'left',
        width,
        render: (_, record) => {
            const id = getId(record);
            const slug = getSlug(record);

            const menuItems: MenuProps['items'] = [
                {
                    key: 'find-comparisons',
                    icon: <SearchOutlined />,
                    label: 'Find Comparisons',
                    onClick: (e) => {
                        e.domEvent.stopPropagation();
                        if (onFindComparisons) onFindComparisons(record);
                    },
                },
                ...(extraMenuItems ? (extraMenuItems(record) || []) : []),
            ];

            return (
                <Space>
                    <Link
                        href={`/${routePrefix}/view/${id}/${slug}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Button type="link" icon={<EyeOutlined />} size="small">
                            View
                        </Button>
                    </Link>
                    <Link
                        href={`/${routePrefix}/edit/${id}/${slug}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Button type="link" icon={<EditOutlined />} size="small">
                            Edit
                        </Button>
                    </Link>
                    <Space.Compact>
                        <Button
                            type="link"
                            size="small"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onVerifyClick && verifyingId !== id) onVerifyClick(record);
                            }}
                            disabled={verifyingId === id}
                        >
                            {verifyingId === id ? <LoadingOutlined /> : <CheckCircleOutlined />} Verify
                        </Button>
                        <Dropdown menu={{items: menuItems}} trigger={['click']}>
                            <Button
                                type="link"
                                size="small"
                                icon={<DownOutlined />}
                                onClick={(e) => e.stopPropagation()}
                            />
                        </Dropdown>
                    </Space.Compact>
                </Space>
            );
        },
    };
}

export function getNameColumn<T>(): ColumnType<T> {
    return {
        key: 'name',
        title: 'Name',
        dataIndex: 'name' as any,
        sorter: true,
        fixed: 'left',
    };
}

export function getIdColumn<T>(): ColumnType<T> {
    return {
        key: 'id',
        title: 'ID',
        dataIndex: 'id' as any,
        sorter: true,
        width: 100,
        fixed: 'left',
    };
}

export function getStatusColumn<T>(
    getVerified: (record: T) => boolean = (r: any) => r.verified || false,
    getApproved: (record: T) => boolean = (r: any) => r.approved || false,
): ColumnType<T> {
    return {
        key: 'status',
        title: 'Status',
        render: (_, record) => (
            <StatusTag
                verified={getVerified(record)}
                approved={getApproved(record)}
            />
        ),
    };
}

export function getCreatedAtColumn<T>(): ColumnType<T> {
    return {
        key: 'created_at',
        title: 'Created At',
        dataIndex: 'created_at' as any,
        sorter: true,
        render: formatDate,
    };
}

export function getUpdatedAtColumn<T>(): ColumnType<T> {
    return {
        key: 'updated_at',
        title: 'Updated At',
        dataIndex: 'updated_at' as any,
        sorter: true,
        render: formatDate,
    };
}
