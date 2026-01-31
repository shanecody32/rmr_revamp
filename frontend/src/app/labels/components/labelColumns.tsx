'use client'

import {CheckCircleOutlined, DownOutlined, EditOutlined, EyeOutlined, LoadingOutlined, SearchOutlined} from '@ant-design/icons';
import {Badge, Button, Dropdown, Space} from 'antd';
import type {ColumnsType} from 'antd/es/table';
import type {MenuProps} from 'antd';
import Link from 'next/link';

import type {LabelListItem} from '@/types/api/labels';
import {formatDate} from '@/lib/utils';

export const columnOptions = [
    {key: 'actions', label: 'Actions', required: true},
    {key: 'id', label: 'ID'},
    {key: 'name', label: 'Name', required: true},
    {key: 'album_count', label: 'Albums'},
    {key: 'created_at', label: 'Created At'},
    {key: 'updated_at', label: 'Updated At'},
] as const;

interface LabelColumnProps {
    onVerifyClick?: (record: LabelListItem) => void;
    onFindComparisons?: (record: LabelListItem) => void;
    verifyingLabelId?: number | null;
}

export const getLabelColumns = ({
    onVerifyClick,
    onFindComparisons,
    verifyingLabelId,
}: LabelColumnProps): ColumnsType<LabelListItem> => [
    {
        key: 'actions',
        title: 'Actions',
        fixed: 'left',
        width: 250,
        render: (_, record) => {
            const verifyMenuItems: MenuProps['items'] = [
                {
                    key: 'find-comparisons',
                    icon: <SearchOutlined />,
                    label: 'Find Comparisons',
                    onClick: (e) => {
                        e.domEvent.stopPropagation();
                        if (onFindComparisons) onFindComparisons(record);
                    }
                },
            ];

            return (
                <Space>
                    <Link
                        href={`/labels/view/${record.id}/${record.slug}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Button
                            type="link"
                            icon={<EyeOutlined/>}
                            size="small"
                        >
                            View
                        </Button>
                    </Link>
                    <Link
                        href={`/labels/edit/${record.id}/${record.slug}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Button
                            type="link"
                            icon={<EditOutlined/>}
                            size="small"
                        >
                            Edit
                        </Button>
                    </Link>
                    <Space.Compact>
                        <Button
                            type="link"
                            size="small"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onVerifyClick && verifyingLabelId !== record.id) onVerifyClick(record);
                            }}
                            disabled={verifyingLabelId === record.id}
                        >
                            {verifyingLabelId === record.id ? <LoadingOutlined /> : <CheckCircleOutlined />} Verify
                        </Button>
                        <Dropdown menu={{ items: verifyMenuItems }} trigger={['click']}>
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
    },
    {
        key: 'id',
        title: 'ID',
        dataIndex: 'id',
        sorter: true,
        width: 100,
        fixed: 'left',
    },
    {
        key: 'name',
        title: 'Name',
        dataIndex: 'name',
        sorter: true,
        fixed: 'left',
        render: (name: string) => (
            <span style={{fontWeight: 500}}>{name}</span>
        ),
    },
    {
        key: 'album_count',
        title: 'Albums',
        dataIndex: 'album_count',
        width: 100,
        render: (count: number) => (
            <Badge count={count} showZero style={{backgroundColor: count > 0 ? '#1890ff' : '#d9d9d9'}} />
        ),
    },
    {
        key: 'created_at',
        title: 'Created At',
        dataIndex: 'created_at',
        sorter: true,
        render: formatDate,
    },
    {
        key: 'updated_at',
        title: 'Updated At',
        dataIndex: 'updated_at',
        sorter: true,
        render: formatDate,
    },
];
