import type {ColumnsType} from 'antd/es/table';

import {formatDate} from '@/lib/utils';
import type {RadioStationResponse} from '@/types/api/radio-stations';

export const columnOptions = [
    {key: 'name', label: 'Name', required: true},
    {key: 'active', label: 'Status'},
    {key: 'verified', label: 'Verification Status'},
    {key: 'approved', label: 'Approval Status'},
    {key: 'created_at', label: 'Created At'},
    {key: 'updated_at', label: 'Updated At'},
];

export const radioStationColumns: ColumnsType<RadioStationResponse> = [
    {
        key: 'name',
        title: 'Name',
        dataIndex: 'name',
        sorter: true,
    },
    {
        key: 'active',
        title: 'Status',
        dataIndex: 'active',
        render: (active: boolean) => active ? 'Active' : 'Inactive',
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
