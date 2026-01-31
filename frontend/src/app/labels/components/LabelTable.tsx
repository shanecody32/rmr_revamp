'use client'

import type {ColumnType, TablePaginationConfig} from 'antd/es/table';
import type {SorterResult} from 'antd/es/table/interface';
import {Table} from 'antd';
import {useMemo} from 'react';

import {getLabelColumns} from './labelColumns';
import type {LabelListItem} from '@/types/api/labels';
import type {TableSortParams} from '@/types/table';

interface LabelTableProps {
    data: LabelListItem[];
    loading: boolean;
    currentPage: number;
    pageSize: number;
    total: number;
    sortParams: TableSortParams;
    visibleColumns: string[];
    onTableChange: (
        pagination: TablePaginationConfig,
        _: any,
        sorter: SorterResult<LabelListItem> | SorterResult<LabelListItem>[]
    ) => void;
    onRowClick: (record: LabelListItem) => void;
    onVerifyClick?: (record: LabelListItem) => void;
    onFindComparisons?: (record: LabelListItem) => void;
    verifyingLabelId?: number | null;
}

export default function LabelTable({
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
    verifyingLabelId,
}: LabelTableProps) {
    const labelColumns = useMemo(() => getLabelColumns({
        onVerifyClick,
        onFindComparisons,
        verifyingLabelId,
    }), [onVerifyClick, onFindComparisons, verifyingLabelId]);

    const normalizedSortField = typeof sortParams.field === 'string' ? sortParams.field : undefined;
    const normalizedSortOrder = sortParams.order ?? null;

    const visibleLabelColumns = useMemo(() => labelColumns
        .filter(col => visibleColumns.includes(col.key as string))
        .map(col => {
            const sortableColumn = col as ColumnType<LabelListItem>;

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
        }), [labelColumns, visibleColumns, normalizedSortField, normalizedSortOrder]);

    return (
        <>
            <Table
                columns={visibleLabelColumns}
                dataSource={data}
                loading={loading}
                rowKey="id"
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
                onRow={(record) => ({
                    onClick: () => onRowClick(record)
                })}
                scroll={{x: 'max-content'}}
                size="middle"
            />
            <style jsx global>{`
                .ant-table-row {
                    cursor: pointer;
                }
                .ant-table-row:hover {
                    background: #fafafa;
                }
                .ant-table-cell {
                    padding: 12px 16px !important;
                }
            `}</style>
        </>
    );
}
