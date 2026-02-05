'use client'

import type {ColumnsType} from 'antd/es/table';

import {
    getEntityActionColumn,
    getIdColumn,
    getNameColumn,
    getStatusColumn,
    getCreatedAtColumn,
    getUpdatedAtColumn,
} from '@/components/common/columns/entityColumns';
import {ActiveStatusTag} from '@/lib/utils/status';
import type {RadioStationResponse} from '@/types/api';

export const columnOptions = [
    {key: 'actions', label: 'Actions', required: true},
    {key: 'id', label: 'ID'},
    {key: 'name', label: 'Name', required: true},
    {key: 'status', label: 'Status'},
    {key: 'active', label: 'Active Status'},
    {key: 'created_at', label: 'Created At'},
    {key: 'updated_at', label: 'Updated At'},
] as const;

interface RadioStationColumnProps {
    onVerifyClick?: (record: RadioStationResponse) => void;
    onFindComparisons?: (record: RadioStationResponse) => void;
    verifyingStationId?: number | null;
}

export const getRadioStationColumns = ({
    onVerifyClick,
    onFindComparisons,
    verifyingStationId,
}: RadioStationColumnProps): ColumnsType<RadioStationResponse> => [
    getEntityActionColumn<RadioStationResponse>({
        routePrefix: 'radio-stations',
        getId: (r) => r.id,
        getSlug: (r) => r.slug || '',
        onVerifyClick,
        onFindComparisons,
        verifyingId: verifyingStationId,
    }),
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

// Backwards compatibility export
export const radioStationColumns: ColumnsType<RadioStationResponse> = getRadioStationColumns({});
