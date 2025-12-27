'use client'

import {PlusOutlined} from '@ant-design/icons';
import {App, Button, Space} from 'antd';
import {useRouter} from 'next/navigation';
import {useEffect, useRef, useState} from 'react';

import DetailDrawer from '@/components/common/data/DetailView/DetailDrawer';
import TableContainer from '@/components/common/data/tables/TableContainer';
import TableToolbar from '@/components/common/data/tables/TableToolbar';
import ErrorAlert from '@/components/common/feedback/ErrorAlert';
import {columnOptions} from '@/app/bands/components/bandColumns';
import {useColumnVisibility} from '@/hooks/useColumnVisibility';
import {useDetailDrawer} from '@/hooks/useDetailDrawer';
import {useTableData} from '@/hooks/useTableData';
import {fetchBandById, fetchBands, fetchSimilarBands, updateBand} from '@/lib/api/bands';
import {bandFilterOptions} from '@/lib/config/filterOptions';
import {handleApiError} from '@/lib/errors';
import type {BandResponse, BandWithDiscographyResponse} from '@/types/api';
import type {ApiError} from '@/types/error';

import AddBandModal from './AddBandModal';
import AdvancedSearchDrawer from './AdvancedSearchDrawer';
import BandMergeComparison from './BandMergeComparison';
import BandsTable from './BandsTable';
import SimilarBandsModal from './SimilarBandsModal';


export default function BandsPageContent() {
    const mounted = useRef(true);
    const router = useRouter();
    const {message} = App.useApp();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false);
    const [updateError, setUpdateError] = useState<ApiError | null>(null);
    const [searchFilters, setSearchFilters] = useState<{
        genre_id?: number;
        sub_genre_id?: number;
    }>({});

    // States for band verification and merge process
    const [isSimilarBandsModalOpen, setIsSimilarBandsModalOpen] = useState(false);
    const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
    const [similarBands, setSimilarBands] = useState<any[]>([]);
    const [bandToVerify, setBandToVerify] = useState<BandResponse | null>(null);
    const [selectedBandsToMerge, setSelectedBandsToMerge] = useState<any[]>([]);
    const [loadingSimilarBands, setLoadingSimilarBands] = useState(false);
    const [verifyingBandId, setVerifyingBandId] = useState<number | null>(null);

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
    } = useTableData<BandResponse>({
        fetchData: fetchBands,
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
                    const bandDetails = await fetchBandById(selectedItem.id);
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

        // Extract genre and sub-genre IDs for highlighting
        const {genre_id, sub_genre_id, ...otherFilters} = filters;

        // Update search filters for highlighting
        setSearchFilters({
            genre_id: genre_id ? Number(genre_id) : undefined,
            sub_genre_id: sub_genre_id ? Number(sub_genre_id) : undefined,
        });

        // Load data with all filters
        loadData(1, undefined, undefined, filters);
        setIsAdvancedSearchOpen(false);
    };

    const handleAddSuccess = (band: BandResponse) => {
        if (!mounted.current) return;
        setIsAddModalOpen(false);
        refresh();
        showDrawer(band);
    };

    // Handle verify button click
    const handleVerifyClick = async (band: BandResponse) => {
        if (!mounted.current) return;

        try {
            setLoadingSimilarBands(true);
            setVerifyingBandId(band.id);
            setBandToVerify(band);

            // Search for similar bands
            const similar = await fetchSimilarBands({
                search_term: band.name,
                existing_id: band.id
            });

            setSimilarBands(similar.filter(b => b.id !== band.id)); // Filter out the band itself

            // If no similar bands found, go directly to edit page
            if (similar.length <= 1) { // 1 because the band itself might be in the results
                router.push(`/bands/edit/${band.id}/${band.slug}`);
                return;
            }

            // Otherwise show the similar bands modal
            setIsSimilarBandsModalOpen(true);

        } catch (error) {
            console.error('Error fetching similar bands:', error);
            message.error('Failed to find similar bands');
        } finally {
            setLoadingSimilarBands(false);
            setVerifyingBandId(null);
        }
    };

    // Handle selecting a band from similar bands modal
    const handleSelectSimilarBand = (band: any) => {
        if (!mounted.current) return;
        router.push(`/bands/view/${band.id}/${band.slug}`);
        setIsSimilarBandsModalOpen(false);
    };

    // Handle proceeding without merging
    const handleProceedWithoutMerge = () => {
        if (!bandToVerify || !mounted.current) return;
        router.push(`/bands/edit/${bandToVerify.id}/${bandToVerify.slug}`);
        setIsSimilarBandsModalOpen(false);
    };

    // Handle selecting bands to merge
    const handleSelectBandsToMerge = (selectedBands: any[]) => {
        if (!mounted.current || !bandToVerify) return;

        setSelectedBandsToMerge(selectedBands);
        setIsSimilarBandsModalOpen(false);
        setIsMergeModalOpen(true);
    };

    // Handle merge completion
    const handleMergeComplete = (mergedBand: BandResponse) => {
        if (!mounted.current) return;

        message.success('Bands merged successfully');
        setIsMergeModalOpen(false);
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
                            onAdvancedSearch={() => setIsAdvancedSearchOpen(true)}
                        />
                        <Button
                            type="primary"
                            icon={<PlusOutlined/>}
                            onClick={() => setIsAddModalOpen(true)}
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
                    searchFilters={searchFilters}
                    onTableChange={handleTableChange}
                    onRowClick={showDrawer}
                    onVerifyClick={handleVerifyClick}
                    verifyingBandId={verifyingBandId}
                />
            </TableContainer>

            <AddBandModal
                open={isAddModalOpen}
                onCancel={() => setIsAddModalOpen(false)}
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
                open={isAdvancedSearchOpen}
                onClose={() => setIsAdvancedSearchOpen(false)}
                onSearch={handleAdvancedSearch}
                filterType={filterType || 'contains'}
                onFilterTypeChange={setFilterType}
                filters={filters}
            />

            {/* Modal for showing similar bands */}
            <SimilarBandsModal
                open={isSimilarBandsModalOpen}
                onCancel={() => setIsSimilarBandsModalOpen(false)}
                onSelect={handleSelectSimilarBand}
                onProceed={handleProceedWithoutMerge}
                onMergeSelected={handleSelectBandsToMerge}
                similarBands={similarBands}
                newBandName={bandToVerify?.name || ''}
                loading={loadingSimilarBands}
                mode="select-multiple"
            />

            {/* Modal for comparing and merging bands */}
            {bandToVerify && (
                <BandMergeComparison
                    open={isMergeModalOpen}
                    onCancel={() => {
                        setIsMergeModalOpen(false);
                        setIsSimilarBandsModalOpen(true); // Go back to band selection
                    }}
                    originalBandId={bandToVerify.id}
                    selectedBandIds={selectedBandsToMerge.map(band => band.id)}
                    onMergeComplete={handleMergeComplete}
                />
            )}
        </>
    );
}
