'use client'

import type {ColumnType, ColumnsType, TablePaginationConfig} from 'antd/es/table';
import type {SorterResult} from 'antd/es/table/interface';
import {Table} from 'antd';
import {useMemo} from 'react';

import type {TableSortParams} from '@/types/table';

interface EntityTableProps<T> {
    columns: ColumnsType<T>;
    data: T[];
    loading: boolean;
    currentPage: number;
    pageSize: number;
    total: number;
    sortParams: TableSortParams;
    visibleColumns: string[];
    onTableChange: (
        pagination: TablePaginationConfig,
        filters: any,
        sorter: SorterResult<T> | SorterResult<T>[]
    ) => void;
    onRowClick: (record: T) => void;
    rowClassName?: (record: T) => string;
    scroll?: {x?: number | string; y?: number | string};
}

export default function EntityTable<T extends {id: number}>({
    columns,
    data,
    loading,
    currentPage,
    pageSize,
    total,
    sortParams,
    visibleColumns,
    onTableChange,
    onRowClick,
    rowClassName,
    scroll,
}: EntityTableProps<T>) {
    const normalizedSortField = typeof sortParams.field === 'string' ? sortParams.field : undefined;
    const normalizedSortOrder = sortParams.order ?? null;

    const visibleCols = useMemo(() => columns
        .filter(col => visibleColumns.includes(col.key as string))
        .map(col => {
            if ('children' in col && col.children) {
                return col;
            }

            const sortableColumn = col as ColumnType<T>;

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
        }), [columns, visibleColumns, normalizedSortField, normalizedSortOrder]);

    return (
        <>
            <Table
                columns={visibleCols}
                dataSource={data}
                loading={loading}
                rowKey="id"
                rowClassName={rowClassName}
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
                scroll={scroll ?? {x: 'max-content'}}
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
