import type {ColumnsType} from 'antd/es/table';

import {formatDate} from '@/lib/utils';
import type {AlbumResponse} from '@/types/api/albums';

export const columnOptions = [
    {key: 'name', label: 'Name', required: true},
    {key: 'verified', label: 'Verification Status'},
    {key: 'approved', label: 'Approval Status'},
    {key: 'created_at', label: 'Created At'},
    {key: 'updated_at', label: 'Updated At'},
] as const;

export const albumColumns: ColumnsType<AlbumResponse> = [
    {
        key: 'name',
        title: 'Name',
        dataIndex: 'name',
        sorter: true,
    },
    {
        key: 'verified',
        title: 'Verification Status',
        dataIndex: 'verified',
        render: (verified: boolean) => verified ? 'Verified' : 'Pending',
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