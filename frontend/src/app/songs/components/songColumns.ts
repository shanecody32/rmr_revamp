import type {ColumnsType} from 'antd/es/table';

import type {SongResponse} from '@/types/api/songs';

import {getBaseColumns} from '../../../components/tables/columns/baseColumns';

export const columnOptions = [
    {key: 'name', label: 'Name', required: true},
    {key: 'status', label: 'Status'},
    {key: 'created_at', label: 'Created At'},
    {key: 'updated_at', label: 'Updated At'},
];

export const songColumns: ColumnsType<SongResponse> = getBaseColumns<SongResponse>();
