'use client'

import {PlusOutlined} from '@ant-design/icons';
import {App, Button, Checkbox, Space, Switch, Tag, Typography} from 'antd';
import {useRouter} from 'next/navigation';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import EntityTable from '@/components/common/data/tables/EntityTable';
import TableContainer from '@/components/common/data/tables/TableContainer';
import TableToolbar from '@/components/common/data/tables/TableToolbar';
import ErrorAlert from '@/components/common/feedback/ErrorAlert';
import SimilarEntitiesModal, {type SearchSettings, loadSavedSettings} from '@/components/common/modals/SimilarEntitiesModal';
import type {SimilarEntity} from '@/components/common/modals/SimilarEntitiesModal';
import {columnOptions, getStaffColumns} from './staffColumns';
import {useColumnVisibility} from '@/hooks/useColumnVisibility';
import {useTableData} from '@/hooks/useTableData';
import {fetchStaffList, fetchStaffById, fetchSimilarStaff, updateStaff} from '@/lib/api/staff';
import {staffFilterOptions} from '@/lib/config/filterOptions';
import type {StaffListViewEnriched, StaffSimilarityParams, SimilarStaff, StaffResponse} from '@/types/api/staff';
import {getStaffDisplayName} from '@/types/api/staff';

import AddStaffModal from './AddStaffModal';
import StaffAdvancedSearchDrawer from './StaffAdvancedSearchDrawer';
import StaffMergeComparison from './StaffMergeComparison';

const SETTINGS_KEY = 'staff-similarity-search-settings';

// Extend SimilarStaff with a `name` field for SimilarEntitiesModal compatibility
type SimilarStaffWithName = SimilarStaff & SimilarEntity;

export default function StaffPageContent() {
    const mounted = useRef(true);
    const router = useRouter();
    const {message} = App.useApp();
    const [modals, setModals] = useState({
        add: false,
        advancedSearch: false,
        similarStaff: false,
        merge: false,
    });
    const [showArchived, setShowArchived] = useState(false);

    // States for staff verification and merge process
    const [similarStaff, setSimilarStaff] = useState<SimilarStaffWithName[]>([]);
    const [staffToVerify, setStaffToVerify] = useState<StaffListViewEnriched | null>(null);
    const [selectedStaffToMerge, setSelectedStaffToMerge] = useState<SimilarStaffWithName[]>([]);
    const [loadingSimilarStaff, setLoadingSimilarStaff] = useState(false);
    const [verifyingStaffId, setVerifyingStaffId] = useState<number | null>(null);
    const [searchSettings, setSearchSettings] = useState<SearchSettings>(() => ({
        ...loadSavedSettings(SETTINGS_KEY),
        restrict_to_parent: true, // Default to station-scoped for staff
    }));

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

    // Save page state to sessionStorage
    useEffect(() => {
        if (currentPage && pageSize) {
            sessionStorage.setItem('staff-page', JSON.stringify({page: currentPage, pageSize}));
        }
    }, [currentPage, pageSize]);

    // Restore page state on mount
    useEffect(() => {
        const savedState = sessionStorage.getItem('staff-page');
        if (savedState) {
            try {
                const {page, pageSize: savedPageSize} = JSON.parse(savedState);
                if (page && page > 1) {
                    loadData(page, savedPageSize);
                }
            } catch (e) {
                console.error('Error restoring page state:', e);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const getStaffSlug = (staff: { on_air_name?: string | null; first_name?: string | null; last_name?: string | null }) => {
        return staff.on_air_name
            ? staff.on_air_name.toLowerCase().replace(/\s+/g, '-')
            : `${staff.first_name || ''}-${staff.last_name || ''}`.toLowerCase().replace(/\s+/g, '-');
    };

    const handleRowClick = (record: StaffListViewEnriched) => {
        const slug = getStaffSlug(record);
        router.push(`/staff/view/${record.id}/${slug}`);
    };

    // Map SimilarStaff to SimilarStaffWithName for SimilarEntitiesModal
    const mapSimilarStaff = (staff: SimilarStaff): SimilarStaffWithName => ({
        ...staff,
        name: getStaffDisplayName(staff),
    });

    const handleVerifyClick = useCallback(async (record: StaffListViewEnriched, forceModal = false) => {
        if (!mounted.current) return;

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
            const filtered = results
                .filter((s: SimilarStaff) => s.id !== record.id)
                .map(mapSimilarStaff);

            if (mounted.current) {
                setSimilarStaff(filtered);

                if (!forceModal && filtered.length === 0) {
                    const slug = getStaffSlug(record);
                    router.push(`/system/validation/staff/${record.id}/${slug}`);
                    return;
                }

                setModals(prev => ({...prev, similarStaff: true}));
            }
        } catch (error) {
            console.error('Error fetching similar staff:', error);
            message.error('Failed to search for similar staff members');
            if (forceModal && mounted.current) {
                setSimilarStaff([]);
                setModals(prev => ({...prev, similarStaff: true}));
            }
        } finally {
            if (mounted.current) {
                setLoadingSimilarStaff(false);
                setVerifyingStaffId(null);
            }
        }
    }, [searchSettings, router, message]);

    const handleFindComparisons = useCallback(async (record: StaffListViewEnriched) => {
        await handleVerifyClick(record, true);
    }, [handleVerifyClick]);

    const handleSelectSimilarStaff = (staff: SimilarStaffWithName) => {
        if (!mounted.current) return;
        const slug = getStaffSlug(staff);
        router.push(`/staff/view/${staff.id}/${slug}`);
        setModals(prev => ({...prev, similarStaff: false}));
    };

    const handleProceedWithoutMerge = () => {
        if (!staffToVerify || !mounted.current) return;

        // Verify and navigate to validation page
        updateStaff(staffToVerify.id, {verified: 1} as any)
            .then(() => {
                message.success('Staff member verified successfully');
                refresh();
            })
            .catch(() => {
                message.error('Failed to verify staff member');
            });

        const slug = getStaffSlug(staffToVerify);
        router.push(`/system/validation/staff/${staffToVerify.id}/${slug}`);
        setModals(prev => ({...prev, similarStaff: false}));
    };

    const handleMergeSelection = (selectedStaff: SimilarStaffWithName[]) => {
        if (!mounted.current || !staffToVerify) return;

        setSelectedStaffToMerge(selectedStaff);
        setModals(prev => ({...prev, similarStaff: false, merge: true}));
    };

    const handleRerunSearch = useCallback(async (settings: SearchSettings) => {
        if (!staffToVerify || !mounted.current) return;

        try {
            setLoadingSimilarStaff(true);
            setSearchSettings(settings);

            const displayName = staffToVerify.on_air_name || `${staffToVerify.first_name || ''} ${staffToVerify.last_name || ''}`.trim();
            const params: StaffSimilarityParams = {
                search_term: displayName,
                existing_id: staffToVerify.id,
                radio_station_id: staffToVerify.radio_station_id || undefined,
                restrict_to_parent: settings.restrict_to_parent,
                jw_weight: settings.jw_weight,
                dice_weight: settings.dice_weight,
                min_similarity: settings.min_similarity,
                limit: settings.limit,
            };

            const results = await fetchSimilarStaff(params);
            const filtered = results
                .filter((s: SimilarStaff) => s.id !== staffToVerify.id)
                .map(mapSimilarStaff);

            setSimilarStaff(filtered);
        } catch (error) {
            console.error('Error fetching similar staff:', error);
            message.error('Failed to rerun search');
        } finally {
            setLoadingSimilarStaff(false);
        }
    }, [staffToVerify, message]);

    const handleMergeComplete = (mergedStaff: StaffResponse) => {
        if (!mounted.current) return;

        message.success('Staff members merged successfully');
        setModals(prev => ({...prev, merge: false}));
        setSelectedStaffToMerge([]);
        setStaffToVerify(null);
        refresh();
        const slug = getStaffSlug(mergedStaff);
        router.push(`/system/validation/staff/${mergedStaff.id}/${slug}`);
    };

    const handleAdvancedSearch = (advancedFilters: Record<string, any>) => {
        if (!mounted.current) return;
        loadData(1, undefined, undefined, advancedFilters);
        setModals(prev => ({...prev, advancedSearch: false}));
    };

    const handleAddSuccess = () => {
        setModals(prev => ({...prev, add: false}));
        refresh();
        message.success('Staff member created successfully');
    };

    const staffColumns = useMemo(() => getStaffColumns({
        onVerifyClick: handleVerifyClick,
        onFindComparisons: handleFindComparisons,
        verifyingStaffId,
    }), [handleVerifyClick, handleFindComparisons, verifyingStaffId]);

    const searchedName = staffToVerify
        ? (staffToVerify.on_air_name || `${staffToVerify.first_name || ''} ${staffToVerify.last_name || ''}`.trim())
        : '';

    const {Text} = Typography;

    const renderStaffItem = (entity: SimilarStaffWithName, isSelected: boolean, isManuallyAdded: boolean) => (
        <div className="flex items-start gap-3">
            <Checkbox checked={isSelected} />
            <div className="flex-1 min-w-0">
                <Text strong className="block truncate">{entity.name}</Text>
                <Space size="small" wrap className="mt-2">
                    {isManuallyAdded ? (
                        <Tag color="purple"><PlusOutlined /> Manual</Tag>
                    ) : (
                        <Tag color="blue">{entity.similarity_score}% match</Tag>
                    )}
                    {entity.station_name && (
                        <Tag color="cyan">{entity.station_name}</Tag>
                    )}
                    {entity.station_location && (
                        <Tag color="geekblue">{entity.station_location}</Tag>
                    )}
                    {entity.on_air_name && (
                        <Tag color="purple">On-Air: {entity.on_air_name}</Tag>
                    )}
                    {entity.verified === 1 && <Tag color="green">Verified</Tag>}
                </Space>
            </div>
        </div>
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
                            onAdvancedSearch={() => setModals(prev => ({...prev, advancedSearch: true}))}
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
                            onClick={() => setModals(prev => ({...prev, add: true}))}
                        >
                            Add Staff
                        </Button>
                    </Space>
                }
            >
                <EntityTable<StaffListViewEnriched>
                    columns={staffColumns}
                    data={data}
                    loading={loading}
                    currentPage={currentPage}
                    pageSize={pageSize}
                    total={total}
                    sortParams={sortParams}
                    visibleColumns={visibleColumns}
                    onTableChange={handleTableChange}
                    onRowClick={handleRowClick}
                    rowClassName={(record) => {
                        if (record.archived === 1) return 'bg-gray-50 opacity-60';
                        return 'cursor-pointer hover:bg-gray-50';
                    }}
                    scroll={{x: 1000}}
                />
            </TableContainer>

            <AddStaffModal
                open={modals.add}
                onCancel={() => setModals(prev => ({...prev, add: false}))}
                onSuccess={handleAddSuccess}
            />

            <StaffAdvancedSearchDrawer
                open={modals.advancedSearch}
                onClose={() => setModals(prev => ({...prev, advancedSearch: false}))}
                onSearch={handleAdvancedSearch}
                filterType={filterType || 'contains'}
                onFilterTypeChange={setFilterType}
                filters={filters}
            />

            <SimilarEntitiesModal<SimilarStaffWithName>
                open={modals.similarStaff}
                onCancel={() => setModals(prev => ({...prev, similarStaff: false}))}
                onSelect={handleSelectSimilarStaff}
                onProceed={handleProceedWithoutMerge}
                onMergeSelected={handleMergeSelection}
                onRerunSearch={handleRerunSearch}
                similarEntities={similarStaff}
                entityName="staff member"
                searchedName={searchedName}
                loading={loadingSimilarStaff}
                mode="select-multiple"
                proceedButtonLabel="Skip Merge & Verify"
                searchSettings={searchSettings}
                settingsStorageKey={SETTINGS_KEY}
                renderItem={renderStaffItem}
                forceRestrictToParent
                manualSearch={{
                    searchEntities: async (query) => {
                        const result = await fetchStaffList({name: query, name_filter_type: 'contains', page: 1, page_size: 20});
                        return result.results;
                    },
                    mapToSimilar: (staff) => ({
                        id: staff.id,
                        first_name: staff.first_name,
                        last_name: staff.last_name,
                        on_air_name: staff.on_air_name,
                        radio_station_id: staff.radio_station_id,
                        similarity_score: 0,
                        verified: staff.verified ?? 0,
                        approved: staff.approved ?? 0,
                        station_name: staff.station_name ?? null,
                        station_location: null,
                        name: getStaffDisplayName(staff),
                    } as SimilarStaffWithName),
                    excludeId: staffToVerify?.id,
                }}
            />

            {staffToVerify && (
                <StaffMergeComparison
                    open={modals.merge}
                    onCancel={() => {
                        setModals(prev => ({...prev, merge: false, similarStaff: true}));
                    }}
                    originalStaffId={staffToVerify.id}
                    selectedStaffIds={selectedStaffToMerge.map(s => s.id)}
                    onMergeComplete={handleMergeComplete}
                />
            )}
        </>
    );
}
