'use client'

import type {ColumnType, TablePaginationConfig} from 'antd/es/table';
import type {SorterResult} from 'antd/es/table/interface';
import {Table} from 'antd';
import {useMemo} from 'react';

import {getBandColumns} from '@/app/bands/components/bandColumns';
import type {BandListViewEnriched} from '@/types/api/bands';
import type {TableSortParams} from '@/types/table';

interface BandsTableProps {
    data: BandListViewEnriched[];
    loading: boolean;
    currentPage: number;
    pageSize: number;
    total: number;
    sortParams: TableSortParams;
    visibleColumns: string[];
    onTableChange: (
        pagination: TablePaginationConfig,
        _: any,
        sorter: SorterResult<BandListViewEnriched> | SorterResult<BandListViewEnriched>[]
    ) => void;
    onRowClick: (record: BandListViewEnriched) => void;
    onVerifyClick?: (record: BandListViewEnriched) => void;
    onFindComparisons?: (record: BandListViewEnriched) => void;
    verifyingBandId?: number | null;
}

export default function BandsTable({
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
                                       verifyingBandId
                                   }: BandsTableProps) {
    const bandColumns = useMemo(() => getBandColumns({
        onVerifyClick,
        onFindComparisons,
        verifyingBandId
    }), [onVerifyClick, onFindComparisons, verifyingBandId]);

    const normalizedSortField = typeof sortParams.field === 'string' ? sortParams.field : undefined;
    const normalizedSortOrder = sortParams.order ?? null;

    const visibleBandColumns = useMemo(() => bandColumns
        .filter(col => visibleColumns.includes(col.key as string))
        .map(col => {
            if ('children' in col && col.children) {
                return col;
            }

            const sortableColumn = col as ColumnType<BandListViewEnriched>;

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
        }), [bandColumns, visibleColumns, normalizedSortField, normalizedSortOrder]);

    return (
        <>
            <Table
                columns={visibleBandColumns}
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
                scroll={{ x: 'max-content' }}
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
