'use client'

import {CheckCircleOutlined, DownOutlined, EditOutlined, EyeOutlined, LoadingOutlined, SearchOutlined} from '@ant-design/icons';
import {Button, Dropdown, Space, Tag, Tooltip} from 'antd';
import type {ColumnsType} from 'antd/es/table';
import type {MenuProps} from 'antd';
import Link from 'next/link';

import {resolveBackendImageUrl} from '@/lib/utils/media';
import type {BandListViewEnriched} from '@/types/api/bands';

import {formatDate} from '@/lib/utils';
import {StatusTag} from '@/lib/utils/status';

export const columnOptions = [
    {key: 'actions', label: 'Actions', required: true},
    {key: 'id', label: 'ID'},
    {key: 'name', label: 'Name', required: true},
    {key: 'location', label: 'Location'},
    {key: 'genres', label: 'Genres'},
    {key: 'sub_genres', label: 'Sub-Genres'},
    {key: 'status', label: 'Status'},
    {key: 'created_at', label: 'Created At'},
    {key: 'updated_at', label: 'Updated At'},
] as const;

const MAX_VISIBLE_TAGS = 3;

interface BandColumnProps {
    onVerifyClick?: (record: BandListViewEnriched) => void;
    onFindComparisons?: (record: BandListViewEnriched) => void;
    verifyingBandId?: number | null;
}

export const getBandColumns = ({
                                   onVerifyClick,
                                   onFindComparisons,
                                   verifyingBandId
                               }: BandColumnProps): ColumnsType<BandListViewEnriched> => [
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
                        href={`/bands/view/${record.id}/${record.slug}`}
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
                        href={`/bands/edit/${record.id}/${record.slug}`}
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
                                if (onVerifyClick && verifyingBandId !== record.id) onVerifyClick(record);
                            }}
                            disabled={verifyingBandId === record.id}
                        >
                            {verifyingBandId === record.id ? <LoadingOutlined /> : <CheckCircleOutlined />} Verify
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
        render: (name: string, record: BandListViewEnriched) => {
            const imageUrl = record.image_url
                ? resolveBackendImageUrl(record.image_url)
                : null;

            return (
                <Space>
                    {imageUrl ? (
                        <img
                            src={imageUrl}
                            alt={name}
                            style={{
                                width: 32,
                                height: 32,
                                borderRadius: '50%',
                                objectFit: 'cover',
                                flexShrink: 0,
                            }}
                        />
                    ) : (
                        <div
                            style={{
                                width: 32,
                                height: 32,
                                borderRadius: '50%',
                                backgroundColor: '#f0f0f0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                color: '#999',
                                fontSize: 12,
                            }}
                        >
                            {name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                    )}
                    <span style={{fontWeight: 500}}>{name}</span>
                </Space>
            );
        },
    },
    {
        key: 'location',
        title: 'Location',
        render: (_, record) => {
            const parts = [];
            if (record.city_name) parts.push(record.city_name);
            if (record.state_name) parts.push(record.state_name);
            if (record.country_name) parts.push(record.country_name);
            return parts.length ? parts.join(', ') : '-';
        },
    },
    {
        key: 'genres',
        title: 'Genres',
        width: 200,
        render: (_, record) => {
            const genreNames = record.genre_names || [];

            const visible = genreNames.slice(0, MAX_VISIBLE_TAGS);
            const remaining = genreNames.length - MAX_VISIBLE_TAGS;

            return (
                <Space size={[0, 4]} wrap>
                    {visible.map((name, idx) => (
                        <Tag
                            key={`genre-${idx}`}
                            color="blue"
                        >
                            {name}
                        </Tag>
                    ))}
                    {remaining > 0 && (
                        <Tooltip title={genreNames.slice(MAX_VISIBLE_TAGS).join(', ')}>
                            <Tag>+{remaining}</Tag>
                        </Tooltip>
                    )}
                </Space>
            );
        },
    },
    {
        key: 'sub_genres',
        title: 'Sub-Genres',
        width: 200,
        render: (_, record) => {
            const subGenreNames = record.sub_genre_names || [];

            const visible = subGenreNames.slice(0, MAX_VISIBLE_TAGS);
            const remaining = subGenreNames.length - MAX_VISIBLE_TAGS;

            return (
                <Space size={[0, 4]} wrap>
                    {visible.map((name, idx) => (
                        <Tag
                            key={`sub-genre-${idx}`}
                            color="purple"
                        >
                            {name}
                        </Tag>
                    ))}
                    {remaining > 0 && (
                        <Tooltip title={subGenreNames.slice(MAX_VISIBLE_TAGS).join(', ')}>
                            <Tag>+{remaining}</Tag>
                        </Tooltip>
                    )}
                </Space>
            );
        },
    },
    {
        key: 'status',
        title: 'Status',
        render: (_, record) => (
            <StatusTag
                verified={record.verified || false}
                approved={record.approved || false}
            />
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
