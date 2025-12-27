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

    const visibleStationColumns = radioStationColumns.filter(col =>
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
                <Table
                    columns={visibleStationColumns}
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
