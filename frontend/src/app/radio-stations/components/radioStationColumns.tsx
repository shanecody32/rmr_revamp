import type {ColumnsType} from 'antd/es/table';

import {ActiveStatusTag} from "@/lib/utils/status";
import {RadioStationResponse} from "@/types/api";

import {getBaseColumns} from '../../../components/tables/columns/baseColumns';


export const columnOptions = [
    {key: 'id', label: 'ID'},
    {key: 'name', label: 'Name', required: true},
    {key: 'status', label: 'Status'},
    {key: 'active', label: 'Active Status'},
    {key: 'created_at', label: 'Created At'},
    {key: 'updated_at', label: 'Updated At'},
] as const;

const baseColumns = getBaseColumns<RadioStationResponse>();

export const radioStationColumns: ColumnsType<RadioStationResponse> = [
    baseColumns[0], // ID
    baseColumns[1], // Name
    baseColumns[2], // Status
    {
        key: 'active',
        title: 'Active Status',
        dataIndex: 'active',
        render: (active: boolean) => <ActiveStatusTag active={active}/>,
    },
    ...baseColumns.slice(3), // Timestamps
];