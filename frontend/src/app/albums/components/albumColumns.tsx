'use client'

import type {ColumnsType} from 'antd/es/table';

import {
    getIdColumn,
    getNameColumn,
    getStatusColumn,
    getCreatedAtColumn,
    getUpdatedAtColumn,
} from '@/components/common/columns/entityColumns';
import {formatDate} from '@/lib/utils';
import type {AlbumResponse} from '@/types/api';

export const columnOptions = [
    {key: 'id', label: 'ID'},
    {key: 'name', label: 'Name', required: true},
    {key: 'release_date', label: 'Release Date'},
    {key: 'type', label: 'Type'},
    {key: 'status', label: 'Status'},
    {key: 'created_at', label: 'Created At'},
    {key: 'updated_at', label: 'Updated At'},
] as const;

export const albumColumns: ColumnsType<AlbumResponse> = [
    getIdColumn<AlbumResponse>(),
    getNameColumn<AlbumResponse>(),
    {
        key: 'release_date',
        title: 'Release Date',
        dataIndex: 'release_date',
        render: (date: string | null) => formatDate(date),
        sorter: true,
    },
    {
        key: 'type',
        title: 'Type',
        render: (_, record) => {
            const types = [];
            if (record.compilation) types.push('Compilation');
            if (record.soundtrack) types.push('Soundtrack');
            return types.length ? types.join(', ') : 'Standard Album';
        },
    },
    getStatusColumn<AlbumResponse>(),
    getCreatedAtColumn<AlbumResponse>(),
    getUpdatedAtColumn<AlbumResponse>(),
];
