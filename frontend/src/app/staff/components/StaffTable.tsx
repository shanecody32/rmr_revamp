'use client'

import type {ColumnType, TablePaginationConfig} from 'antd/es/table';
import type {SorterResult} from 'antd/es/table/interface';
import {Table} from 'antd';

import {getStaffColumns} from './staffColumns';
import type {StaffListViewEnriched} from '@/types/api/staff';
import type {TableSortParams} from '@/types/table';

interface StaffTableProps {
    data: StaffListViewEnriched[];
    loading: boolean;
    currentPage: number;
    pageSize: number;
    total: number;
    sortParams: TableSortParams;
    visibleColumns: string[];
    onTableChange: (
        pagination: TablePaginationConfig,
        _: any,
        sorter: SorterResult<StaffListViewEnriched> | SorterResult<StaffListViewEnriched>[]
    ) => void;
    onRowClick: (record: StaffListViewEnriched) => void;
    onVerifyClick?: (record: StaffListViewEnriched) => void;
    onFindComparisons?: (record: StaffListViewEnriched) => void;
    verifyingStaffId?: number | null;
}

export default function StaffTable({
    data,
    loading,
    currentPage,
    pageSize,
    total,
    sortParams,
    visibleColumns,
    onTableChange,
    onRowClick,
    onVerifyClick,
    onFindComparisons,
    verifyingStaffId
}: StaffTableProps) {
    const staffColumns = getStaffColumns({
        onVerifyClick,
        onFindComparisons,
        verifyingStaffId
    });

    const normalizedSortField = typeof sortParams.field === 'string'
        ? sortParams.field
        : undefined;
    const normalizedSortOrder = sortParams.order ?? null;

    const visibleStaffColumns = staffColumns
        .filter(col => visibleColumns.includes(col.key as string))
        .map(col => {
            if ('children' in col && col.children) {
                return col;
            }

            const sortableColumn = col as ColumnType<StaffListViewEnriched>;

            if (!sortableColumn.sorter) {
                return sortableColumn;
            }

            const columnField = typeof sortableColumn.dataIndex === 'string'
                ? sortableColumn.dataIndex
                : undefined;
            const isActiveSort = columnField && columnField === normalizedSortField;

            return {
                ...sortableColumn,
                sortOrder: isActiveSort ? normalizedSortOrder : null,
            };
        });

    return (
        <Table
            columns={visibleStaffColumns}
            dataSource={data}
            loading={loading}
            rowKey="id"
            rowClassName={(record) => {
                if (record.archived === 1) return 'bg-gray-50 opacity-60';
                return 'cursor-pointer hover:bg-gray-50';
            }}
            onRow={(record) => ({
                onClick: () => onRowClick(record),
            })}
            pagination={{
                current: currentPage,
                pageSize: pageSize,
                total: total,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
                pageSizeOptions: ['10', '25', '50', '100']
            }}
            onChange={onTableChange}
            scroll={{x: 1000}}
        />
    );
}
