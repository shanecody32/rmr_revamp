'use client'

import {PlusOutlined} from '@ant-design/icons';
import {Button, Space} from 'antd';
import {useState} from 'react';

import DetailDrawer from '@/components/common/data/DetailView/DetailDrawer';
import EntityTable from '@/components/common/data/tables/EntityTable';
import TableContainer from '@/components/common/data/tables/TableContainer';
import TableToolbar from '@/components/common/data/tables/TableToolbar';
import ErrorAlert from '@/components/common/feedback/ErrorAlert';
import {columnOptions, radioStationColumns} from '@/app/radio-stations/components/radioStationColumns';
import {useColumnVisibility} from '@/hooks/useColumnVisibility';
import {useDetailDrawer} from '@/hooks/useDetailDrawer';
import {useTableData} from '@/hooks/useTableData';
import {fetchRadioStations} from '@/lib/api/radio-stations';
import type {RadioStationResponse} from '@/types/api';

import AddRadioStationModal from './AddRadioStationModal';

const filterOptions = [
    {
        key: 'active_verified',
        label: 'Active & Verified',
        description: 'Currently broadcasting and verified'
    },
    {
        key: 'active_pending',
        label: 'Active Only',
        description: 'Currently broadcasting, pending verification'
    },
    {
        key: 'verified_inactive',
        label: 'Verified Only',
        description: 'Verified but not currently active'
    },
    {
        key: 'pending_all',
        label: 'Pending All',
        description: 'Inactive and pending verification'
    }
];

export default function RadioStationsPageContent() {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const {selectedItem, drawerVisible, showDrawer, closeDrawer} = useDetailDrawer<RadioStationResponse>();

    const {visibleColumns, setVisibleColumns} = useColumnVisibility({
        defaultColumns: columnOptions.map(col => col.key),
        storageKey: 'radio-stations-visible-columns',
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
    } = useTableData<RadioStationResponse>({
        fetchData: fetchRadioStations,
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
                title="Radio Stations"
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
                            searchPlaceholder="Search stations..."
                        />
                        <Button
                            type="primary"
                            icon={<PlusOutlined/>}
                            onClick={() => setIsAddModalOpen(true)}
                        >
                            Add Station
                        </Button>
                    </Space>
                }
            >
                <EntityTable<RadioStationResponse>
                    columns={radioStationColumns}
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

            <AddRadioStationModal
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
                title="Radio Station Details"
                extraFields={[
                    {
                        label: 'Automatic Updates',
                        key: 'automatic' as keyof RadioStationResponse,
                        render: (value: any) => value ? 'Yes' : 'No',
                        span: 2
                    }
                ]}
            />
        </>
    );
}
