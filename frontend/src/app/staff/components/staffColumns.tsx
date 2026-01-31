'use client'

import {Badge, Button, Space, Tag, Tooltip} from 'antd';
import {
    CheckCircleOutlined,
    SearchOutlined,
    InboxOutlined,
    SwapOutlined,
} from '@ant-design/icons';
import type {ColumnType} from 'antd/es/table';

import {resolveBackendImageUrl} from '@/lib/utils/media';
import type {StaffListViewEnriched} from '@/types/api/staff';
import {getStaffDisplayName} from '@/types/api/staff';

export interface GetStaffColumnsOptions {
    onVerifyClick?: (record: StaffListViewEnriched) => void;
    onFindComparisons?: (record: StaffListViewEnriched) => void;
    verifyingStaffId?: number | null;
}

export const columnOptions = [
    {key: 'name', label: 'Name'},
    {key: 'station', label: 'Station'},
    {key: 'email', label: 'Email'},
    {key: 'position', label: 'Position'},
    {key: 'sub_genres', label: 'Sub-Genres'},
    {key: 'status', label: 'Status'},
    {key: 'actions', label: 'Actions'},
];

export function getStaffColumns(options: GetStaffColumnsOptions = {}): ColumnType<StaffListViewEnriched>[] {
    const {onVerifyClick, onFindComparisons, verifyingStaffId} = options;

    return [
        {
            title: 'Name',
            key: 'name',
            sorter: true,
            dataIndex: 'last_name',
            render: (_: any, record: StaffListViewEnriched) => {
                const displayName = getStaffDisplayName(record);
                return (
                    <Space>
                        {record.image_url && (
                            <img
                                src={resolveBackendImageUrl(record.image_url)}
                                alt={displayName}
                                className="w-8 h-8 rounded-full object-cover"
                            />
                        )}
                        <span className="font-medium">{displayName}</span>
                        {record.is_transfer_source && (
                            <Tooltip title="Transferred to another station">
                                <Tag color="orange" icon={<SwapOutlined/>}>
                                    Transferred
                                </Tag>
                            </Tooltip>
                        )}
                        {record.is_transfer_target && (
                            <Tooltip title="Transferred from another station">
                                <Tag color="blue" icon={<SwapOutlined/>}>
                                    From Transfer
                                </Tag>
                            </Tooltip>
                        )}
                        {record.archived === 1 && (
                            <Tag color="gray" icon={<InboxOutlined/>}>
                                Archived
                            </Tag>
                        )}
                    </Space>
                );
            },
        },
        {
            title: 'Station',
            key: 'station',
            dataIndex: 'station_name',
            sorter: false,
            render: (stationName: string | null) => stationName || '-',
        },
        {
            title: 'Email',
            key: 'email',
            dataIndex: 'email',
            sorter: false,
            render: (email: string | null) => email || '-',
        },
        {
            title: 'Position',
            key: 'position',
            dataIndex: 'position',
            sorter: false,
            render: (position: string | null) => position || '-',
        },
        {
            title: 'Sub-Genres',
            key: 'sub_genres',
            sorter: false,
            render: (_: any, record: StaffListViewEnriched) => {
                if (!record.sub_genre_names || record.sub_genre_names.length === 0) {
                    return '-';
                }
                const displayGenres = record.sub_genre_names.slice(0, 3);
                const remaining = record.sub_genre_names.length - 3;
                return (
                    <Space size={[0, 4]} wrap>
                        {displayGenres.map((genre, idx) => (
                            <Tag key={idx} color="blue">
                                {genre}
                            </Tag>
                        ))}
                        {remaining > 0 && (
                            <Tooltip title={record.sub_genre_names.slice(3).join(', ')}>
                                <Tag>+{remaining}</Tag>
                            </Tooltip>
                        )}
                    </Space>
                );
            },
        },
        {
            title: 'Status',
            key: 'status',
            sorter: false,
            render: (_: any, record: StaffListViewEnriched) => (
                <Space size="small">
                    <Tooltip title={record.verified ? 'Verified' : 'Not Verified'}>
                        <Badge
                            status={record.verified ? 'success' : 'default'}
                            text={record.verified ? 'V' : ''}
                        />
                    </Tooltip>
                    <Tooltip title={record.approved ? 'Approved' : 'Not Approved'}>
                        <Badge
                            status={record.approved ? 'success' : 'default'}
                            text={record.approved ? 'A' : ''}
                        />
                    </Tooltip>
                    {record.has_playlist === 1 && (
                        <Tooltip title="Has Playlist">
                            <Tag color="green">P</Tag>
                        </Tooltip>
                    )}
                </Space>
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            fixed: 'right' as const,
            width: 150,
            render: (_: any, record: StaffListViewEnriched) => (
                <Space size="small" onClick={(e) => e.stopPropagation()}>
                    {!record.verified && onVerifyClick && (
                        <Tooltip title="Verify Staff Member">
                            <Button
                                type="text"
                                size="small"
                                icon={<CheckCircleOutlined/>}
                                loading={verifyingStaffId === record.id}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onVerifyClick(record);
                                }}
                            />
                        </Tooltip>
                    )}
                    {onFindComparisons && (
                        <Tooltip title="Find Similar Staff">
                            <Button
                                type="text"
                                size="small"
                                icon={<SearchOutlined/>}
                                loading={verifyingStaffId === record.id}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onFindComparisons(record);
                                }}
                            />
                        </Tooltip>
                    )}
                </Space>
            ),
        },
    ];
}

export default getStaffColumns;
