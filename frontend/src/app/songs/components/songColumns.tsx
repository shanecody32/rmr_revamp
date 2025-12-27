import type {ColumnsType} from 'antd/es/table';

import {SongResponse} from "@/types/api";

import {getBaseColumns} from '../../../components/tables/columns/baseColumns';

export const columnOptions = [
    {key: 'id', label: 'ID'},
    {key: 'name', label: 'Name', required: true},
    {key: 'status', label: 'Status'},
    {key: 'created_at', label: 'Created At'},
    {key: 'updated_at', label: 'Updated At'},
] as const;

export const songColumns: ColumnsType<SongResponse> = getBaseColumns<SongResponse>();