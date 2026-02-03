'use client'

import {Badge} from 'antd';
import type {ColumnsType} from 'antd/es/table';

import {
    getEntityActionColumn,
    getIdColumn,
    getCreatedAtColumn,
    getUpdatedAtColumn,
} from '@/components/common/columns/entityColumns';
import type {LabelListItem} from '@/types/api/labels';

export const columnOptions = [
    {key: 'actions', label: 'Actions', required: true},
    {key: 'id', label: 'ID'},
    {key: 'name', label: 'Name', required: true},
    {key: 'album_count', label: 'Albums'},
    {key: 'created_at', label: 'Created At'},
    {key: 'updated_at', label: 'Updated At'},
] as const;

interface LabelColumnProps {
    onVerifyClick?: (record: LabelListItem) => void;
    onFindComparisons?: (record: LabelListItem) => void;
    verifyingLabelId?: number | null;
}

export const getLabelColumns = ({
    onVerifyClick,
    onFindComparisons,
    verifyingLabelId,
}: LabelColumnProps): ColumnsType<LabelListItem> => [
    getEntityActionColumn<LabelListItem>({
        routePrefix: 'labels',
        getId: (r) => r.id,
        getSlug: (r) => r.slug,
        onVerifyClick,
        onFindComparisons,
        verifyingId: verifyingLabelId,
    }),
    getIdColumn<LabelListItem>(),
    {
        key: 'name',
        title: 'Name',
        dataIndex: 'name',
        sorter: true,
        fixed: 'left',
        render: (name: string) => (
            <span style={{fontWeight: 500}}>{name}</span>
        ),
    },
    {
        key: 'album_count',
        title: 'Albums',
        dataIndex: 'album_count',
        width: 100,
        render: (count: number) => (
            <Badge count={count} showZero style={{backgroundColor: count > 0 ? '#1890ff' : '#d9d9d9'}} />
        ),
    },
    getCreatedAtColumn<LabelListItem>(),
    getUpdatedAtColumn<LabelListItem>(),
];
