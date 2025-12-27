// Removed unused import: import type { ColumnsType } from 'antd/es/table';

import type {BaseEntity} from '@/types/api/common';

export function getSortOrder(
    field: string,
    sortField?: string,
    sortOrder?: 'ascend' | 'descend' | null
) {
    return field === sortField ? sortOrder : null;
}

export function getColumnWidth(key: string): number {
    const widths: Record<string, number> = {
        name: 250,
        status: 150,
        created_at: 180,
        updated_at: 180,
        website: 200,
    };
    return widths[key] || 150;
}

export function getBaseTableProps<T extends BaseEntity>() {
    return {
        rowKey: 'id' as keyof T,
        scroll: {x: 1200},
        showSorterTooltip: false,
    };
}
