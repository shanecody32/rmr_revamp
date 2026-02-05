'use client'

import type {ColumnsType} from 'antd/es/table';

import {
    getEntityActionColumn,
    getIdColumn,
    getStatusColumn,
    getCreatedAtColumn,
    getUpdatedAtColumn,
} from '@/components/common/columns/entityColumns';
import type {SongResponse} from '@/types/api';

export const columnOptions = [
    {key: 'actions', label: 'Actions', required: true},
    {key: 'id', label: 'ID'},
    {key: 'name', label: 'Name', required: true},
    {key: 'band_id', label: 'Band ID'},
    {key: 'sub_genre_id', label: 'Sub-Genre ID'},
    {key: 'status', label: 'Status'},
    {key: 'created_at', label: 'Created At'},
    {key: 'updated_at', label: 'Updated At'},
] as const;

interface SongColumnProps {
    onVerifyClick?: (record: SongResponse) => void;
    onFindComparisons?: (record: SongResponse) => void;
    verifyingSongId?: number | null;
}

export const getSongColumns = ({
    onVerifyClick,
    onFindComparisons,
    verifyingSongId,
}: SongColumnProps): ColumnsType<SongResponse> => [
    getEntityActionColumn<SongResponse>({
        routePrefix: 'songs',
        getId: (r) => r.id,
        getSlug: (r) => r.slug,
        onVerifyClick,
        onFindComparisons,
        verifyingId: verifyingSongId,
    }),
    getIdColumn<SongResponse>(),
    {
        key: 'name',
        title: 'Name',
        dataIndex: 'name',
        sorter: true,
        fixed: 'left',
        render: (name: string) => <span className="font-medium">{name}</span>,
    },
    {
        key: 'band_id',
        title: 'Band ID',
        dataIndex: 'band_id',
        sorter: true,
        width: 120,
    },
    {
        key: 'sub_genre_id',
        title: 'Sub-Genre ID',
        dataIndex: 'sub_genre_id',
        sorter: true,
        width: 140,
    },
    getStatusColumn<SongResponse>(),
    getCreatedAtColumn<SongResponse>(),
    getUpdatedAtColumn<SongResponse>(),
];
