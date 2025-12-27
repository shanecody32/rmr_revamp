'use client'

import {PlusOutlined} from '@ant-design/icons';
import {Button, Space, Table} from 'antd';
import type {TablePaginationConfig} from 'antd/es/table';
import type {SorterResult} from 'antd/es/table/interface';
import {useState} from 'react';

import DetailDrawer from '@/components/common/data/DetailView/DetailDrawer';
import TableContainer from '@/components/common/data/tables/TableContainer';
import TableToolbar from '@/components/common/data/tables/TableToolbar';
import ErrorAlert from '@/components/common/feedback/ErrorAlert';
import {columnOptions, songColumns} from '@/app/songs/components/songColumns';
import {useColumnVisibility} from '@/hooks/useColumnVisibility';
import {useDetailDrawer} from '@/hooks/useDetailDrawer';
import {useTableData} from '@/hooks/useTableData';
import {fetchSongs} from '@/lib/api/songs';
import type {SongResponse} from '@/types/api';

import AddSongModal from './AddSongModal';

const filterOptions = [
    {
        key: 'verified_approved',
        label: 'Verified & Approved',
        description: 'Fully validated songs'
    },
    {
        key: 'verified_pending',
        label: 'Verified Only',
        description: 'Identity verified, awaiting approval'
    },
    {
        key: 'approved_only',
        label: 'Approved Only',
        description: 'Content approved, verification needed'
    },
    {
        key: 'pending_all',
        label: 'Pending All',
        description: 'Awaiting verification & approval'
    }
];

export default function SongsPageContent() {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const {selectedItem, drawerVisible, showDrawer, closeDrawer} = useDetailDrawer<SongResponse>();

    const {visibleColumns, setVisibleColumns} = useColumnVisibility({
        defaultColumns: columnOptions.map(col => col.key),
        storageKey: 'songs-visible-columns',
    });

    const {
        loading,
        data,
        total,
        error,
        searchTerm,
        setSearchTerm,
        filterType,
        setFilterType,
        filters,
        setFilters,
        loadData,
        refresh,
        sortParams,
        handleTableChange,
        currentPage,
        pageSize,
    } = useTableData<SongResponse>({
        fetchData: fetchSongs,
    });

    const visibleSongColumns = songColumns.filter(col =>
        visibleColumns.includes(col.key as string)
    );


    return (
        <>
            {error && (
                <ErrorAlert
                    error={error}
                    onClose={() => loadData()}
                />
            )}

            <TableContainer
                title="Songs"
                actions={
                    <Space size="middle">
                        <TableToolbar
                            onSearch={setSearchTerm}
                            onFilterTypeChange={setFilterType}
                            onFilterChange={setFilters}
                            onColumnChange={setVisibleColumns}
                            filterOptions={filterOptions}
                            columnOptions={columnOptions}
                            visibleColumns={visibleColumns}
                            activeFilters={filters}
                            searchTerm={searchTerm}
                            filterType={filterType || 'contains'}
                            searchPlaceholder="Search songs..."
                        />
                        <Button
                            type="primary"
                            icon={<PlusOutlined/>}
                            onClick={() => setIsAddModalOpen(true)}
                        >
                            Add Song
                        </Button>
                    </Space>
                }
            >
                <Table
                    columns={visibleSongColumns}
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
                    onChange={handleTableChange}
                    onRow={(record) => ({
                        onClick: () => showDrawer(record)
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
            </TableContainer>

            <AddSongModal
                open={isAddModalOpen}
                onCancel={() => setIsAddModalOpen(false)}
                onSuccess={() => {
                    setIsAddModalOpen(false);
                    refresh();
                }}
            />

            <DetailDrawer
                open={drawerVisible}
                onClose={closeDrawer}
                data={selectedItem}
                title="Song Details"
                extraFields={[
                    {
                        label: 'Band',
                        key: 'band_id' as keyof SongResponse,
                        span: 2
                    }
                ]}
            />
        </>
    );
}
