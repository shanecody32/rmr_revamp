'use client'

import {PlusOutlined} from '@ant-design/icons';
import {App, Button, Space} from 'antd';
import {useRouter} from 'next/navigation';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import DetailDrawer from '@/components/common/data/DetailView/DetailDrawer';
import EntityTable from '@/components/common/data/tables/EntityTable';
import TableContainer from '@/components/common/data/tables/TableContainer';
import TableToolbar from '@/components/common/data/tables/TableToolbar';
import ErrorAlert from '@/components/common/feedback/ErrorAlert';
import SimilarEntitiesModal, {type SearchSettings, loadSavedSettings} from '@/components/common/modals/SimilarEntitiesModal';
import {columnOptions, getRadioStationColumns} from '@/app/radio-stations/components/radioStationColumns';
import {useColumnVisibility} from '@/hooks/useColumnVisibility';
import {useDetailDrawer} from '@/hooks/useDetailDrawer';
import {useTableData} from '@/hooks/useTableData';
import {
    fetchRadioStations,
    fetchSimilarRadioStations,
    type SimilarRadioStation,
} from '@/lib/api/radio-stations';
import type {RadioStationResponse} from '@/types/api';

import AddRadioStationModal from './AddRadioStationModal';
import RadioStationMergeComparison from './RadioStationMergeComparison';

const SETTINGS_KEY = 'radio-station-similarity-search-settings';

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
    const mounted = useRef(true);
    const router = useRouter();
    const {message} = App.useApp();
    const [modals, setModals] = useState({
        add: false,
        similarStations: false,
        merge: false,
    });

    // States for station verification and merge process
    const [similarStations, setSimilarStations] = useState<SimilarRadioStation[]>([]);
    const [stationToVerify, setStationToVerify] = useState<RadioStationResponse | null>(null);
    const [selectedStationsToMerge, setSelectedStationsToMerge] = useState<SimilarRadioStation[]>([]);
    const [loadingSimilarStations, setLoadingSimilarStations] = useState(false);
    const [verifyingStationId, setVerifyingStationId] = useState<number | null>(null);
    const [searchSettings, setSearchSettings] = useState<SearchSettings>(() =>
        loadSavedSettings(SETTINGS_KEY)
    );

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

    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    // Handle verify button click (forceModal = true bypasses "no results" redirect)
    const handleVerifyClick = useCallback(async (station: RadioStationResponse, forceModal = false) => {
        if (!mounted.current) return;

        try {
            setLoadingSimilarStations(true);
            setVerifyingStationId(station.id);
            setStationToVerify(station);

            const similar = await fetchSimilarRadioStations({
                search_term: station.name,
                existing_id: station.id,
                jw_weight: searchSettings.jw_weight,
                dice_weight: searchSettings.dice_weight,
                min_similarity: searchSettings.min_similarity,
                limit: searchSettings.limit,
            });

            setSimilarStations(similar.filter(s => s.id !== station.id));

            if (!forceModal && similar.length <= 1) {
                // No similar matches - go directly to validation page
                router.push(`/system/validation/radio-station/${station.id}/${station.slug}`);
                return;
            }

            setModals(prev => ({...prev, similarStations: true}));

        } catch (error) {
            console.error('Error fetching similar stations:', error);
            message.error('Failed to find similar radio stations');
            if (forceModal) {
                setSimilarStations([]);
                setModals(prev => ({...prev, similarStations: true}));
            }
        } finally {
            setLoadingSimilarStations(false);
            setVerifyingStationId(null);
        }
    }, [searchSettings, router, message]);

    // Force show comparisons modal (always shows even with no results)
    const handleFindComparisons = useCallback(async (station: RadioStationResponse) => {
        await handleVerifyClick(station, true);
    }, [handleVerifyClick]);

    // Handle selecting a station from similar stations modal
    const handleSelectSimilarStation = (station: SimilarRadioStation) => {
        if (!mounted.current) return;
        const slug = station.name.toLowerCase().replace(/\s+/g, '-');
        router.push(`/radio-stations/view/${station.id}/${slug}`);
        setModals(prev => ({...prev, similarStations: false}));
    };

    // Handle proceeding without merging - go to validation page
    const handleProceedWithoutMerge = () => {
        if (!stationToVerify || !mounted.current) return;
        router.push(`/system/validation/radio-station/${stationToVerify.id}/${stationToVerify.slug}`);
        setModals(prev => ({...prev, similarStations: false}));
    };

    // Handle selecting stations to merge
    const handleSelectStationsToMerge = (selectedStations: SimilarRadioStation[]) => {
        if (!mounted.current || !stationToVerify) return;

        setSelectedStationsToMerge(selectedStations);
        setModals(prev => ({...prev, similarStations: false, merge: true}));
    };

    // Handle rerunning search with new settings
    const handleRerunSearch = useCallback(async (settings: SearchSettings) => {
        if (!stationToVerify || !mounted.current) return;

        try {
            setLoadingSimilarStations(true);
            setSearchSettings(settings);

            const similar = await fetchSimilarRadioStations({
                search_term: stationToVerify.name,
                existing_id: stationToVerify.id,
                jw_weight: settings.jw_weight,
                dice_weight: settings.dice_weight,
                min_similarity: settings.min_similarity,
                limit: settings.limit,
            });

            setSimilarStations(similar.filter(s => s.id !== stationToVerify.id));
        } catch (error) {
            console.error('Error fetching similar stations:', error);
            message.error('Failed to rerun search');
        } finally {
            setLoadingSimilarStations(false);
        }
    }, [stationToVerify, message]);

    // Handle merge completion - go to validation page
    const handleMergeComplete = (mergedStation: RadioStationResponse) => {
        if (!mounted.current) return;

        message.success('Radio stations merged successfully');
        setModals(prev => ({...prev, merge: false}));
        refresh();
        router.push(`/system/validation/radio-station/${mergedStation.id}/${mergedStation.slug}`);
    };

    const radioStationColumns = useMemo(() => getRadioStationColumns({
        onVerifyClick: handleVerifyClick,
        onFindComparisons: handleFindComparisons,
        verifyingStationId,
    }), [handleVerifyClick, handleFindComparisons, verifyingStationId]);

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
                            columnOptions={[...columnOptions]}
                            visibleColumns={visibleColumns}
                            activeFilters={filters}
                            searchTerm={searchTerm}
                            filterType={filterType || 'contains'}
                            searchPlaceholder="Search stations..."
                        />
                        <Button
                            type="primary"
                            icon={<PlusOutlined/>}
                            onClick={() => setModals(prev => ({...prev, add: true}))}
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
                open={modals.add}
                onCancel={() => setModals(prev => ({...prev, add: false}))}
                onSuccess={() => {
                    setModals(prev => ({...prev, add: false}));
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

            <SimilarEntitiesModal<SimilarRadioStation>
                open={modals.similarStations}
                onCancel={() => setModals(prev => ({...prev, similarStations: false}))}
                onSelect={handleSelectSimilarStation}
                onProceed={handleProceedWithoutMerge}
                onMergeSelected={handleSelectStationsToMerge}
                onRerunSearch={handleRerunSearch}
                similarEntities={similarStations}
                entityName="radio station"
                searchedName={stationToVerify?.name || ''}
                loading={loadingSimilarStations}
                mode="select-multiple"
                searchSettings={searchSettings}
                settingsStorageKey={SETTINGS_KEY}
                manualSearch={{
                    searchEntities: async (query) => {
                        const result = await fetchRadioStations({name: query, name_filter_type: 'contains', page: 1, page_size: 20});
                        return result.data;
                    },
                    mapToSimilar: (station) => ({
                        id: station.id,
                        name: station.name,
                        similarity_score: 0,
                    } as SimilarRadioStation),
                    excludeId: stationToVerify?.id,
                }}
            />

            {stationToVerify && (
                <RadioStationMergeComparison
                    open={modals.merge}
                    onCancel={() => {
                        setModals(prev => ({...prev, merge: false, similarStations: true}));
                    }}
                    originalStationId={stationToVerify.id}
                    selectedStationIds={selectedStationsToMerge.map(station => station.id)}
                    onMergeComplete={handleMergeComplete}
                />
            )}
        </>
    );
}
