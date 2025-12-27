'use client'

import type {ColumnsType} from 'antd/es/table';

import {AlbumResponse} from '@/types/api';
import {formatDate} from '@/lib/utils';

import {getBaseColumns} from '../../../components/tables/columns/baseColumns';

export const columnOptions = [{key: 'id', label: 'ID'}, {
    key: 'name',
    label: 'Name',
    required: true
}, {key: 'release_date', label: 'Release Date'}, {key: 'type', label: 'Type'}, {
    key: 'status',
    label: 'Status'
}, {key: 'created_at', label: 'Created At'}, {key: 'updated_at', label: 'Updated At'},] as const;

const baseColumns = getBaseColumns<AlbumResponse>();

export const albumColumns: ColumnsType<AlbumResponse> = [baseColumns[0], // ID
    baseColumns[1], // Name
    {
        key: 'release_date',
        title: 'Release Date',
        dataIndex: 'release_date',
        render: (date: string | null) => formatDate(date),
        sorter: true,
    }, {
        key: 'type', title: 'Type', render: (_, record) => {
            const types = [];
            if (record.compilation) types.push('Compilation');
            if (record.soundtrack) types.push('Soundtrack');
            return types.length ? types.join(', ') : 'Standard Album';
        },
    }, baseColumns[2], // Status
    baseColumns[3], // Created At
    baseColumns[4], // Updated At
];