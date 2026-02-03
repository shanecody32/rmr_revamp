'use client'

import {PlusOutlined} from '@ant-design/icons';
import {Button, Space} from 'antd';
import {useMemo, useState} from 'react';

import DetailDrawer from '@/components/common/data/DetailView/DetailDrawer';
import EntityTable from '@/components/common/data/tables/EntityTable';
import TableContainer from '@/components/common/data/tables/TableContainer';
import TableToolbar from '@/components/common/data/tables/TableToolbar';
import ErrorAlert from '@/components/common/feedback/ErrorAlert';
import {albumColumns, columnOptions as readonlyColumnOptions} from '@/app/albums/components/albumColumns';
import {useColumnVisibility} from '@/hooks/useColumnVisibility';
import {useDetailDrawer} from '@/hooks/useDetailDrawer';
import {useTableData} from '@/hooks/useTableData';
import {fetchAlbums} from '@/lib/api/albums';
import type {AlbumResponse} from '@/types/api';

import AddAlbumModal from './AddAlbumModal';

const filterOptions = [
    {
        key: 'verified_approved',
        label: 'Verified & Approved',
        description: 'Fully validated albums'
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

export default function AlbumsPageContent() {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const {selectedItem, drawerVisible, showDrawer, closeDrawer} = useDetailDrawer<AlbumResponse>();

    // Create a mutable copy of the readonly columnOptions
    const columnOptions = useMemo(() =>
            readonlyColumnOptions.map(col => ({...col})),
        []
    );

    const {visibleColumns, setVisibleColumns} = useColumnVisibility({
        defaultColumns: columnOptions.map(col => col.key),
        storageKey: 'albums-visible-columns',
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
    } = useTableData<AlbumResponse>({
        fetchData: fetchAlbums,
    });

    return (
        <>
            {error && (
                <ErrorAlert
                    error={error}
                    onClose={() => loadData()}
                />
            )}

            <TableContainer
                title="Albums"
                actions={
                    <Space size="middle">
                        <TableToolbar
                            searchTerm={searchTerm}
                            filterType={filterType || 'contains'}
                            onSearch={setSearchTerm}
                            onFilterTypeChange={setFilterType}
                            onFilterChange={setFilters}
                            onColumnChange={setVisibleColumns}
                            filterOptions={filterOptions}
                            columnOptions={columnOptions}
                            visibleColumns={visibleColumns}
                            activeFilters={filters}
                            searchPlaceholder="Search albums..."
                        />
                        <Button
                            type="primary"
                            icon={<PlusOutlined/>}
                            onClick={() => setIsAddModalOpen(true)}
                        >
                            Add Album
                        </Button>
                    </Space>
                }
            >
                <EntityTable<AlbumResponse>
                    columns={albumColumns}
                    data={data}
                    loading={loading}
                    currentPage={currentPage}
                    pageSize={pageSize}
                    total={total}
                    sortParams={sortParams}
                    visibleColumns={visibleColumns}
                    onTableChange={handleTableChange}
                    onRowClick={showDrawer}
                />
            </TableContainer>

            <AddAlbumModal
                visible={isAddModalOpen}
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
                title="Album Details"
                extraFields={[
                    {
                        label: 'Release Date',
                        key: 'release_date' as keyof AlbumResponse,
                        render: (value) => (value ?? 'Not set'),
                        span: 2
                    },
                    {
                        label: 'Label',
                        key: 'label_id' as keyof AlbumResponse,
                        span: 2
                    },
                    {
                        label: 'Type',
                        key: 'type' as keyof AlbumResponse,
                        render: (_: any, record: AlbumResponse) => {
                            const types = [];
                            if (record.compilation) types.push('Compilation');
                            if (record.soundtrack) types.push('Soundtrack');
                            return types.length ? types.join(', ') : 'Standard Album';
                        },
                        span: 2
                    }
                ]}
            />
        </>
    );
}
