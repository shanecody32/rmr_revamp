'use client'

import type {ColumnsType} from 'antd/es/table';

import {
    getIdColumn,
    getNameColumn,
    getStatusColumn,
    getCreatedAtColumn,
    getUpdatedAtColumn,
} from '@/components/common/columns/entityColumns';
import {ActiveStatusTag} from '@/lib/utils/status';
import type {RadioStationResponse} from '@/types/api';

export const columnOptions = [
    {key: 'id', label: 'ID'},
    {key: 'name', label: 'Name', required: true},
    {key: 'status', label: 'Status'},
    {key: 'active', label: 'Active Status'},
    {key: 'created_at', label: 'Created At'},
    {key: 'updated_at', label: 'Updated At'},
] as const;

export const radioStationColumns: ColumnsType<RadioStationResponse> = [
    getIdColumn<RadioStationResponse>(),
    getNameColumn<RadioStationResponse>(),
    getStatusColumn<RadioStationResponse>(),
    {
        key: 'active',
        title: 'Active Status',
        dataIndex: 'active',
        render: (active: boolean) => <ActiveStatusTag active={active}/>,
    },
    getCreatedAtColumn<RadioStationResponse>(),
    getUpdatedAtColumn<RadioStationResponse>(),
];
