'use client'

import {PlusOutlined} from '@ant-design/icons';
import {App, Button, Space, Switch} from 'antd';
import {useRouter} from 'next/navigation';
import {useEffect, useRef, useState} from 'react';

import TableContainer from '@/components/common/data/tables/TableContainer';
import TableToolbar from '@/components/common/data/tables/TableToolbar';
import ErrorAlert from '@/components/common/feedback/ErrorAlert';
import {columnOptions} from './staffColumns';
import {useColumnVisibility} from '@/hooks/useColumnVisibility';
import {useTableData} from '@/hooks/useTableData';
import {fetchStaffList, fetchStaffById, fetchSimilarStaff, updateStaff} from '@/lib/api/staff';
import {staffFilterOptions} from '@/lib/config/filterOptions';
import type {StaffListViewEnriched, StaffSimilarityParams} from '@/types/api/staff';

import AddStaffModal from './AddStaffModal';
import StaffTable from './StaffTable';
import SimilarStaffModal, {type SearchSettings} from './SimilarStaffModal';
import StaffMergeComparisonModal from './StaffMergeComparisonModal';

export default function StaffPageContent() {
    const mounted = useRef(true);
    const router = useRouter();
    const {message} = App.useApp();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [showArchived, setShowArchived] = useState(false);

    // States for staff verification and merge process
    const [isSimilarStaffModalOpen, setIsSimilarStaffModalOpen] = useState(false);
    const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
    const [similarStaff, setSimilarStaff] = useState<any[]>([]);
    const [staffToVerify, setStaffToVerify] = useState<StaffListViewEnriched | null>(null);
    const [selectedStaffToMerge, setSelectedStaffToMerge] = useState<any[]>([]);
    const [loadingSimilarStaff, setLoadingSimilarStaff] = useState(false);
    const [verifyingStaffId, setVerifyingStaffId] = useState<number | null>(null);
    const [searchSettings, setSearchSettings] = useState<SearchSettings>(() => {
        const defaults: SearchSettings = {
            jw_weight: 0.6,
            dice_weight: 0.4,
            min_similarity: 70,
            restrict_to_parent: true, // Default to station-scoped for staff
            limit: 20,
        };
        if (typeof window === 'undefined') return defaults;
        try {
            const saved = localStorage.getItem('staff-similarity-search-settings');
            if (saved) {
                return {...defaults, ...JSON.parse(saved)};
            }
        } catch (e) {
            console.error('Error loading saved settings:', e);
        }
        return defaults;
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
    } = useTableData<StaffListViewEnriched>({
        fetchData: async (params) => {
            // Convert filters to API params
            const apiParams: Record<string, any> = {
                ...params,
                archived: showArchived,
            };

            if (filters.verified_approved) {
                apiParams.verified = true;
                apiParams.approved = true;
            } else if (filters.verified_pending) {
                apiParams.verified = true;
                apiParams.approved = false;
            } else if (filters.approved_only) {
                apiParams.approved = true;
            } else if (filters.pending_all) {
                apiParams.verified = false;
                apiParams.approved = false;
            }
            if (filters.has_playlist) {
                apiParams.has_playlist = true;
            }

            const response = await fetchStaffList(apiParams);
            // Transform response to match useTableData expected format
            return {
                data: response.results,
                pagination: response.pagination,
            };
        },
    });

    const {visibleColumns, setVisibleColumns} = useColumnVisibility({
        defaultColumns: columnOptions.map(col => col.key),
        storageKey: 'staff-visible-columns',
    });

    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    // Reload when showArchived changes
    useEffect(() => {
        refresh();
    }, [showArchived]);

    const handleRowClick = (record: StaffListViewEnriched) => {
        const slug = record.on_air_name
            ? record.on_air_name.toLowerCase().replace(/\s+/g, '-')
            : `${record.first_name || ''}-${record.last_name || ''}`.toLowerCase().replace(/\s+/g, '-');
        router.push(`/staff/view/${record.id}/${slug}`);
    };

    const handleVerifyClick = async (record: StaffListViewEnriched) => {
        setStaffToVerify(record);
        setVerifyingStaffId(record.id);
        setLoadingSimilarStaff(true);

        try {
            const displayName = record.on_air_name || `${record.first_name || ''} ${record.last_name || ''}`.trim();
            const params: StaffSimilarityParams = {
                search_term: displayName,
                existing_id: record.id,
                radio_station_id: record.radio_station_id || undefined,
                restrict_to_parent: searchSettings.restrict_to_parent,
                jw_weight: searchSettings.jw_weight,
                dice_weight: searchSettings.dice_weight,
                min_similarity: searchSettings.min_similarity,
                limit: searchSettings.limit,
            };

            const results = await fetchSimilarStaff(params);
            if (mounted.current) {
                setSimilarStaff(results);
                setIsSimilarStaffModalOpen(true);
            }
        } catch (error) {
            console.error('Error fetching similar staff:', error);
            message.error('Failed to search for similar staff members');
        } finally {
            if (mounted.current) {
                setLoadingSimilarStaff(false);
                setVerifyingStaffId(null);
            }
        }
    };

    const handleFindComparisons = async (record: StaffListViewEnriched) => {
        await handleVerifyClick(record);
    };

    const handleSimilarStaffModalClose = () => {
        setIsSimilarStaffModalOpen(false);
        setSimilarStaff([]);
        setStaffToVerify(null);
    };

    const handleMergeSelection = async (selectedIds: number[]) => {
        if (!staffToVerify) return;

        // Load full details for selected staff
        const staffDetails = await Promise.all([
            fetchStaffById(staffToVerify.id),
            ...selectedIds.map(id => fetchStaffById(id))
        ]);

        setSelectedStaffToMerge(staffDetails);
        setIsSimilarStaffModalOpen(false);
        setIsMergeModalOpen(true);
    };

    const handleVerifyOnly = async () => {
        if (!staffToVerify) return;

        try {
            await updateStaff(staffToVerify.id, {verified: 1} as any);
            message.success('Staff member verified successfully');
            refresh();
            handleSimilarStaffModalClose();
        } catch (error) {
            message.error('Failed to verify staff member');
        }
    };

    const handleMergeComplete = () => {
        setIsMergeModalOpen(false);
        setSelectedStaffToMerge([]);
        setStaffToVerify(null);
        refresh();
        message.success('Staff members merged successfully');
    };

    const handleMergeCancel = () => {
        setIsMergeModalOpen(false);
        setSelectedStaffToMerge([]);
    };

    const handleSearchSettingsChange = (newSettings: SearchSettings) => {
        setSearchSettings(newSettings);
        try {
            localStorage.setItem('staff-similarity-search-settings', JSON.stringify(newSettings));
        } catch (e) {
            console.error('Error saving settings:', e);
        }
    };

    const handleAddSuccess = () => {
        setIsAddModalOpen(false);
        refresh();
        message.success('Staff member created successfully');
    };

    return (
        <>
            {error && (
                <ErrorAlert
                    error={error}
                    onClose={() => loadData()}
                />
            )}

            <TableContainer
                title="Staff Members"
                actions={
                    <Space size="middle">
                        <TableToolbar
                            searchTerm={searchTerm}
                            onSearch={setSearchTerm}
                            filterType={filterType || 'contains'}
                            onFilterTypeChange={setFilterType}
                            onFilterChange={setFilters}
                            onColumnChange={setVisibleColumns}
                            filterOptions={[...staffFilterOptions]}
                            columnOptions={[...columnOptions]}
                            visibleColumns={visibleColumns}
                            activeFilters={filters}
                            searchPlaceholder="Search staff..."
                        />
                        <Space>
                            <span className="text-sm text-gray-600">
                                Show Archived:
                            </span>
                            <Switch
                                checked={showArchived}
                                onChange={setShowArchived}
                                size="small"
                            />
                        </Space>
                        <Button
                            type="primary"
                            icon={<PlusOutlined/>}
                            onClick={() => setIsAddModalOpen(true)}
                        >
                            Add Staff
                        </Button>
                    </Space>
                }
            >
                <StaffTable
                    data={data}
                    loading={loading}
                    currentPage={currentPage}
                    pageSize={pageSize}
                    total={total}
                    sortParams={sortParams}
                    visibleColumns={visibleColumns}
                    onTableChange={handleTableChange}
                    onRowClick={handleRowClick}
                    onVerifyClick={handleVerifyClick}
                    onFindComparisons={handleFindComparisons}
                    verifyingStaffId={verifyingStaffId}
                />
            </TableContainer>

            <AddStaffModal
                open={isAddModalOpen}
                onCancel={() => setIsAddModalOpen(false)}
                onSuccess={handleAddSuccess}
            />

            <SimilarStaffModal
                open={isSimilarStaffModalOpen}
                onCancel={handleSimilarStaffModalClose}
                staff={staffToVerify}
                similarStaff={similarStaff}
                loading={loadingSimilarStaff}
                onMergeSelection={handleMergeSelection}
                onVerifyOnly={handleVerifyOnly}
                searchSettings={searchSettings}
                onSearchSettingsChange={handleSearchSettingsChange}
            />

            {isMergeModalOpen && (
                <StaffMergeComparisonModal
                    open={isMergeModalOpen}
                    onCancel={handleMergeCancel}
                    staffMembers={selectedStaffToMerge}
                    onMergeComplete={handleMergeComplete}
                />
            )}
        </>
    );
}
