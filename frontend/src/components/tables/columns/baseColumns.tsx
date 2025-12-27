import type {ColumnsType} from 'antd/es/table';

import {formatDate} from '@/lib/utils';
import {StatusTag} from '@/lib/utils/status';
import type {BaseEntity} from '@/types/api/common';


export const getBaseColumns = <T extends BaseEntity>(): ColumnsType<T> => [
    {
        key: 'id',
        title: 'ID',
        dataIndex: 'id',
        sorter: true,
        width: 100,
        fixed: 'left',
    },
    {
        key: 'name',
        title: 'Name',
        dataIndex: 'name',
        sorter: true,
        fixed: 'left',
    },
    {
        key: 'status',
        title: 'Status',
        render: (_, record) => (
            <StatusTag
                verified={record.verified || false}
                approved={record.approved || false}
            />
        ),
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
