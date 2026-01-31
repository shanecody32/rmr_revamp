'use client'

import {PlusOutlined} from '@ant-design/icons';
import {App, Button, Space} from 'antd';
import {useRouter} from 'next/navigation';
import {useCallback, useEffect, useRef, useState} from 'react';

import DetailDrawer from '@/components/common/data/DetailView/DetailDrawer';
import TableContainer from '@/components/common/data/tables/TableContainer';
import TableToolbar from '@/components/common/data/tables/TableToolbar';
import ErrorAlert from '@/components/common/feedback/ErrorAlert';
import {columnOptions} from '@/app/bands/components/bandColumns';
import {useColumnVisibility} from '@/hooks/useColumnVisibility';
import {useDetailDrawer} from '@/hooks/useDetailDrawer';
import {useTableData} from '@/hooks/useTableData';
import {fetchBandDetail, fetchBandsList, fetchSimilarBands, updateBand} from '@/lib/api/bands';
import {bandFilterOptions} from '@/lib/config/filterOptions';
import {handleApiError} from '@/lib/errors';
import type {BandListViewEnriched, BandResponse, BandWithDiscographyResponse} from '@/types/api';
import type {ApiError} from '@/types/error';

import AddBandModal from './AddBandModal';
import AdvancedSearchDrawer from './AdvancedSearchDrawer';
import BandMergeComparison from './BandMergeComparison';
import BandsTable from './BandsTable';
import SimilarBandsModal, {type SearchSettings} from './SimilarBandsModal';


export default function BandsPageContent() {
    const mounted = useRef(true);
    const router = useRouter();
    const {message} = App.useApp();
    const [modals, setModals] = useState({
        add: false,
        advancedSearch: false,
        similarBands: false,
        merge: false,
    });
    const [updateError, setUpdateError] = useState<ApiError | null>(null);

    // States for band verification and merge process
    const [similarBands, setSimilarBands] = useState<any[]>([]);
    const [bandToVerify, setBandToVerify] = useState<BandListViewEnriched | null>(null);
    const [selectedBandsToMerge, setSelectedBandsToMerge] = useState<any[]>([]);
    const [loadingSimilarBands, setLoadingSimilarBands] = useState(false);
    const [verifyingBandId, setVerifyingBandId] = useState<number | null>(null);
    const [searchSettings, setSearchSettings] = useState<SearchSettings>(() => {
        // Load saved settings from localStorage
        const defaults: SearchSettings = {
            jw_weight: 0.6,
            dice_weight: 0.4,
            min_similarity: 70,
            restrict_to_parent: false,
            limit: 20,
        };
        if (typeof window === 'undefined') return defaults;
        try {
            const saved = localStorage.getItem('similarity-search-settings');
            if (saved) {
                return { ...defaults, ...JSON.parse(saved) };
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
    } = useTableData<BandListViewEnriched>({
        fetchData: fetchBandsList,
    });

    const {visibleColumns, setVisibleColumns} = useColumnVisibility({
        defaultColumns: columnOptions.map(col => col.key),
        storageKey: 'bands-visible-columns',
    });

    const {
        selectedItem,
        drawerVisible,
        showDrawer,
        closeDrawer,
        setSelectedItem
    } = useDetailDrawer<BandWithDiscographyResponse>();

    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    // Fetch full band details when drawer opens
    useEffect(() => {
        const fetchBandDetails = async () => {
            if (drawerVisible && selectedItem && !selectedItem.albums) {
                try {
                    const bandDetails = await fetchBandDetail(selectedItem.id, { includeAlbums: true });
                    if (mounted.current) {
                        setSelectedItem(bandDetails);
                    }
                } catch (error) {
                    console.error('Error fetching band details:', error);
                    message.error('Failed to load band details');
                }
            }
        };

        fetchBandDetails();
    }, [drawerVisible, selectedItem, message, setSelectedItem]);

    const handleSave = async (values: Partial<BandResponse>) => {
        if (!selectedItem || !mounted.current) return;

        try {
            setUpdateError(null);
            const updatedBand = await updateBand(selectedItem.id, values);

            if (mounted.current) {
                // Update the selected item in the drawer
                setSelectedItem({
                    ...selectedItem,
                    ...updatedBand
                });
                // Refresh the table data to show updated information
                refresh();
                message.success('Band updated successfully');
            }
        } catch (error) {
            if (mounted.current) {
                const apiError = handleApiError(error);
                setUpdateError(apiError);
                message.error(apiError.message || 'Failed to update band');
            }
        }
    };

    const handleAdvancedSearch = (filters: Record<string, any>) => {
        if (!mounted.current) return;

        // Load data with all filters
        loadData(1, undefined, undefined, filters);
        setModals(prev => ({...prev, advancedSearch: false}));
    };

    const handleAddSuccess = (band: BandResponse) => {
        if (!mounted.current) return;
        setModals(prev => ({...prev, add: false}));
        refresh();
        showDrawer(band);
    };

    // Save page state to sessionStorage when it changes
    useEffect(() => {
        if (currentPage && pageSize) {
            sessionStorage.setItem('bands-page', JSON.stringify({ page: currentPage, pageSize }));
        }
    }, [currentPage, pageSize]);

    // Restore page state on mount
    useEffect(() => {
        const savedState = sessionStorage.getItem('bands-page');
        if (savedState) {
            try {
                const { page, pageSize: savedPageSize } = JSON.parse(savedState);
                if (page && page > 1) {
                    loadData(page, savedPageSize);
                }
            } catch (e) {
                console.error('Error restoring page state:', e);
            }
        }
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Handle verify button click (forceModal = true bypasses "no results" redirect)
    const handleVerifyClick = useCallback(async (band: BandListViewEnriched, forceModal = false) => {
        if (!mounted.current) return;

        try {
            setLoadingSimilarBands(true);
            setVerifyingBandId(band.id);
            setBandToVerify(band);

            // Search for similar bands with current settings
            const similar = await fetchSimilarBands({
                search_term: band.name,
                existing_id: band.id,
                jw_weight: searchSettings.jw_weight,
                dice_weight: searchSettings.dice_weight,
                min_similarity: searchSettings.min_similarity,
                restrict_to_parent: searchSettings.restrict_to_parent,
                limit: searchSettings.limit,
            });

            setSimilarBands(similar.filter(b => b.id !== band.id)); // Filter out the band itself

            // If forceModal is true, always show modal regardless of results
            // Otherwise, if no similar bands found, go directly to edit page
            if (!forceModal && similar.length <= 1) { // 1 because the band itself might be in the results
                router.push(`/bands/edit/${band.id}/${band.slug}`);
                return;
            }

            // Show the similar bands modal
            setModals(prev => ({...prev, similarBands: true}));

        } catch (error) {
            console.error('Error fetching similar bands:', error);
            message.error('Failed to find similar bands');
            // If force modal, still show the modal even with empty results
            if (forceModal) {
                setSimilarBands([]);
                setModals(prev => ({...prev, similarBands: true}));
            }
        } finally {
            setLoadingSimilarBands(false);
            setVerifyingBandId(null);
        }
    }, [searchSettings, router, message]);

    // Force show comparisons modal (always shows even with no results)
    const handleFindComparisons = useCallback(async (band: BandListViewEnriched) => {
        await handleVerifyClick(band, true);
    }, [handleVerifyClick]);

    // Handle selecting a band from similar bands modal
    const handleSelectSimilarBand = (band: any) => {
        if (!mounted.current) return;
        router.push(`/bands/view/${band.id}/${band.slug}`);
        setModals(prev => ({...prev, similarBands: false}));
    };

    // Handle proceeding without merging
    const handleProceedWithoutMerge = () => {
        if (!bandToVerify || !mounted.current) return;
        router.push(`/bands/edit/${bandToVerify.id}/${bandToVerify.slug}`);
        setModals(prev => ({...prev, similarBands: false}));
    };

    // Handle selecting bands to merge
    const handleSelectBandsToMerge = (selectedBands: any[]) => {
        if (!mounted.current || !bandToVerify) return;

        setSelectedBandsToMerge(selectedBands);
        setModals(prev => ({...prev, similarBands: false, merge: true}));
    };

    // Handle rerunning search with new settings
    const handleRerunSearch = useCallback(async (settings: SearchSettings) => {
        if (!bandToVerify || !mounted.current) return;

        try {
            setLoadingSimilarBands(true);
            setSearchSettings(settings);

            const similar = await fetchSimilarBands({
                search_term: bandToVerify.name,
                existing_id: bandToVerify.id,
                jw_weight: settings.jw_weight,
                dice_weight: settings.dice_weight,
                min_similarity: settings.min_similarity,
                restrict_to_parent: settings.restrict_to_parent,
                limit: settings.limit,
            });

            setSimilarBands(similar.filter(b => b.id !== bandToVerify.id));
        } catch (error) {
            console.error('Error fetching similar bands:', error);
            message.error('Failed to rerun search');
        } finally {
            setLoadingSimilarBands(false);
        }
    }, [bandToVerify, message]);

    // Handle merge completion
    const handleMergeComplete = (mergedBand: BandResponse) => {
        if (!mounted.current) return;

        message.success('Bands merged successfully');
        setModals(prev => ({...prev, merge: false}));
        refresh(); // Refresh the bands list
        router.push(`/bands/edit/${mergedBand.id}/${mergedBand.slug}`);
    };

    return (
        <>
            {error && (
                <ErrorAlert
                    error={error}
                    onClose={() => loadData()}
                />
            )}

            {updateError && (
                <ErrorAlert
                    error={updateError}
                    onClose={() => setUpdateError(null)}
                />
            )}

            <TableContainer
                title="Bands"
                actions={
                    <Space size="middle">
                        <TableToolbar
                            searchTerm={searchTerm}
                            onSearch={setSearchTerm}
                            filterType={filterType || 'contains'}
                            onFilterTypeChange={setFilterType}
                            onFilterChange={setFilters}
                            onColumnChange={setVisibleColumns}
                            filterOptions={[...bandFilterOptions]}
                            columnOptions={[...columnOptions]}
                            visibleColumns={visibleColumns}
                            activeFilters={filters}
                            searchPlaceholder="Search bands..."
                            onAdvancedSearch={() => setModals(prev => ({...prev, advancedSearch: true}))}
                        />
                        <Button
                            type="primary"
                            icon={<PlusOutlined/>}
                            onClick={() => setModals(prev => ({...prev, add: true}))}
                        >
                            Add Band
                        </Button>
                    </Space>
                }
            >
                <BandsTable
                    data={data}
                    loading={loading}
                    currentPage={currentPage}
                    pageSize={pageSize}
                    total={total}
                    sortParams={sortParams}
                    visibleColumns={visibleColumns}
                    onTableChange={handleTableChange}
                    onRowClick={(record) => showDrawer(record as unknown as BandWithDiscographyResponse)}
                    onVerifyClick={handleVerifyClick}
                    onFindComparisons={handleFindComparisons}
                    verifyingBandId={verifyingBandId}
                />
            </TableContainer>

            <AddBandModal
                open={modals.add}
                onCancel={() => setModals(prev => ({...prev, add: false}))}
                onSuccess={handleAddSuccess}
            />

            <DetailDrawer
                open={drawerVisible}
                onClose={closeDrawer}
                data={selectedItem}
                title="Band Details"
                extraFields={[
                    {
                        label: 'Website',
                        key: 'website' as keyof BandResponse,
                        render: (website: any) => website || '-',
                        span: 2,
                        editable: true
                    },
                    {
                        label: 'Email',
                        key: 'email' as keyof BandResponse,
                        render: (email: any) => email || '-',
                        span: 2,
                        editable: true
                    }
                ]}
                onSave={handleSave}
            />

            <AdvancedSearchDrawer
                open={modals.advancedSearch}
                onClose={() => setModals(prev => ({...prev, advancedSearch: false}))}
                onSearch={handleAdvancedSearch}
                filterType={filterType || 'contains'}
                onFilterTypeChange={setFilterType}
                filters={filters}
            />

            {/* Modal for showing similar bands */}
            <SimilarBandsModal
                open={modals.similarBands}
                onCancel={() => setModals(prev => ({...prev, similarBands: false}))}
                onSelect={handleSelectSimilarBand}
                onProceed={handleProceedWithoutMerge}
                onMergeSelected={handleSelectBandsToMerge}
                onRerunSearch={handleRerunSearch}
                similarBands={similarBands}
                newBandName={bandToVerify?.name || ''}
                loading={loadingSimilarBands}
                mode="select-multiple"
                searchSettings={searchSettings}
                excludeBandId={bandToVerify?.id}
            />

            {/* Modal for comparing and merging bands */}
            {bandToVerify && (
                <BandMergeComparison
                    open={modals.merge}
                    onCancel={() => {
                        setModals(prev => ({...prev, merge: false, similarBands: true}));
                    }}
                    originalBandId={bandToVerify.id}
                    selectedBandIds={selectedBandsToMerge.map(band => band.id)}
                    onMergeComplete={handleMergeComplete}
                />
            )}
        </>
    );
}
