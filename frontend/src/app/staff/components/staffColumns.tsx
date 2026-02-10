'use client'

import {Badge, Space, Tag, Tooltip} from 'antd';
import type {ColumnsType} from 'antd/es/table';
import {
    InboxOutlined,
    SwapOutlined,
} from '@ant-design/icons';

import {
    getEntityActionColumn,
    getIdColumn,
} from '@/components/common/columns/entityColumns';
import {formatDate} from '@/lib/utils';
import {resolveBackendImageUrl} from '@/lib/utils/media';
import type {StaffListViewEnriched} from '@/types/api/staff';
import {getStaffDisplayName} from '@/types/api/staff';

export interface GetStaffColumnsOptions {
    onVerifyClick?: (record: StaffListViewEnriched) => void;
    onFindComparisons?: (record: StaffListViewEnriched) => void;
    verifyingStaffId?: number | null;
}

export const columnOptions = [
    {key: 'actions', label: 'Actions', required: true},
    {key: 'id', label: 'ID'},
    {key: 'name', label: 'Name', required: true},
    {key: 'station', label: 'Station'},
    {key: 'email', label: 'Email'},
    {key: 'position', label: 'Position'},
    {key: 'sub_genres', label: 'Sub-Genres'},
    {key: 'status', label: 'Status'},
    {key: 'created_at', label: 'Created At'},
    {key: 'updated_at', label: 'Updated At'},
] as const;

const getStaffSlug = (record: StaffListViewEnriched): string => {
    return record.on_air_name
        ? record.on_air_name.toLowerCase().replace(/\s+/g, '-')
        : `${record.first_name || ''}-${record.last_name || ''}`.toLowerCase().replace(/\s+/g, '-');
};

export function getStaffColumns(options: GetStaffColumnsOptions = {}): ColumnsType<StaffListViewEnriched> {
    const {onVerifyClick, onFindComparisons, verifyingStaffId} = options;

    return [
        getEntityActionColumn<StaffListViewEnriched>({
            routePrefix: 'staff',
            getId: (r) => r.id,
            getSlug: getStaffSlug,
            onVerifyClick,
            onFindComparisons,
            verifyingId: verifyingStaffId,
        }),
        getIdColumn<StaffListViewEnriched>(),
        {
            title: 'Name',
            key: 'name',
            sorter: true,
            dataIndex: 'last_name',
            fixed: 'left',
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
            key: 'created_at',
            title: 'Created At',
            dataIndex: 'created',
            sorter: true,
            render: formatDate,
        },
        {
            key: 'updated_at',
            title: 'Updated At',
            dataIndex: 'modified',
            sorter: true,
            render: formatDate,
        },
    ];
}

export default getStaffColumns;
