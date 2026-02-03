'use client'

import {PlusOutlined} from '@ant-design/icons';
import {App, Button, Space} from 'antd';
import {useRouter} from 'next/navigation';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import EntityTable from '@/components/common/data/tables/EntityTable';
import TableContainer from '@/components/common/data/tables/TableContainer';
import TableToolbar from '@/components/common/data/tables/TableToolbar';
import ErrorAlert from '@/components/common/feedback/ErrorAlert';
import SimilarEntitiesModal, {type SearchSettings, loadSavedSettings} from '@/components/common/modals/SimilarEntitiesModal';
import {columnOptions, getLabelColumns} from './labelColumns';
import {useColumnVisibility} from '@/hooks/useColumnVisibility';
import {useTableData} from '@/hooks/useTableData';
import {fetchLabels, fetchSimilarLabels, type SimilarLabel} from '@/lib/api/labels';
import type {LabelListItem, LabelResponse} from '@/types/api/labels';

import AddLabelModal from './AddLabelModal';
import LabelMergeComparison from './LabelMergeComparison';

const SETTINGS_KEY = 'label-similarity-search-settings';

export default function LabelPageContent() {
    const mounted = useRef(true);
    const router = useRouter();
    const {message} = App.useApp();
    const [modals, setModals] = useState({
        add: false,
        similarLabels: false,
        merge: false,
    });

    // States for label similarity and merge process
    const [similarLabels, setSimilarLabels] = useState<SimilarLabel[]>([]);
    const [labelToVerify, setLabelToVerify] = useState<LabelListItem | null>(null);
    const [selectedLabelsToMerge, setSelectedLabelsToMerge] = useState<SimilarLabel[]>([]);
    const [loadingSimilarLabels, setLoadingSimilarLabels] = useState(false);
    const [verifyingLabelId, setVerifyingLabelId] = useState<number | null>(null);
    const [searchSettings, setSearchSettings] = useState<SearchSettings>(() =>
        loadSavedSettings(SETTINGS_KEY)
    );

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
    } = useTableData<LabelListItem>({
        fetchData: fetchLabels,
    });

    const {visibleColumns, setVisibleColumns} = useColumnVisibility({
        defaultColumns: columnOptions.map(col => col.key),
        storageKey: 'labels-visible-columns',
    });

    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    // Save page state to sessionStorage when it changes
    useEffect(() => {
        if (currentPage && pageSize) {
            sessionStorage.setItem('labels-page', JSON.stringify({page: currentPage, pageSize}));
        }
    }, [currentPage, pageSize]);

    // Restore page state on mount
    useEffect(() => {
        const savedState = sessionStorage.getItem('labels-page');
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

    const handleAddSuccess = (label: LabelResponse) => {
        if (!mounted.current) return;
        setModals(prev => ({...prev, add: false}));
        refresh();
    };

    // Handle verify button click (forceModal = true bypasses "no results" redirect)
    const handleVerifyClick = useCallback(async (label: LabelListItem, forceModal = false) => {
        if (!mounted.current) return;

        try {
            setLoadingSimilarLabels(true);
            setVerifyingLabelId(label.id);
            setLabelToVerify(label);

            const similar = await fetchSimilarLabels({
                search_term: label.name,
                existing_id: label.id,
                jw_weight: searchSettings.jw_weight,
                dice_weight: searchSettings.dice_weight,
                min_similarity: searchSettings.min_similarity,
                limit: searchSettings.limit,
            });

            setSimilarLabels(similar.filter(l => l.id !== label.id));

            if (!forceModal && similar.length <= 1) {
                router.push(`/labels/edit/${label.id}/${label.slug}`);
                return;
            }

            setModals(prev => ({...prev, similarLabels: true}));

        } catch (error) {
            console.error('Error fetching similar labels:', error);
            message.error('Failed to find similar labels');
            if (forceModal) {
                setSimilarLabels([]);
                setModals(prev => ({...prev, similarLabels: true}));
            }
        } finally {
            setLoadingSimilarLabels(false);
            setVerifyingLabelId(null);
        }
    }, [searchSettings, router, message]);

    // Force show comparisons modal (always shows even with no results)
    const handleFindComparisons = useCallback(async (label: LabelListItem) => {
        await handleVerifyClick(label, true);
    }, [handleVerifyClick]);

    const handleSelectSimilarLabel = (label: SimilarLabel) => {
        if (!mounted.current) return;
        router.push(`/labels/view/${label.id}/${label.name}`);
        setModals(prev => ({...prev, similarLabels: false}));
    };

    const handleProceedWithoutMerge = () => {
        if (!labelToVerify || !mounted.current) return;
        router.push(`/labels/edit/${labelToVerify.id}/${labelToVerify.slug}`);
        setModals(prev => ({...prev, similarLabels: false}));
    };

    const handleSelectLabelsToMerge = (selectedLabels: SimilarLabel[]) => {
        if (!mounted.current || !labelToVerify) return;
        setSelectedLabelsToMerge(selectedLabels);
        setModals(prev => ({...prev, similarLabels: false, merge: true}));
    };

    const handleRerunSearch = useCallback(async (settings: SearchSettings) => {
        if (!labelToVerify || !mounted.current) return;

        try {
            setLoadingSimilarLabels(true);
            setSearchSettings(settings);

            const similar = await fetchSimilarLabels({
                search_term: labelToVerify.name,
                existing_id: labelToVerify.id,
                jw_weight: settings.jw_weight,
                dice_weight: settings.dice_weight,
                min_similarity: settings.min_similarity,
                limit: settings.limit,
            });

            setSimilarLabels(similar.filter(l => l.id !== labelToVerify.id));
        } catch (error) {
            console.error('Error fetching similar labels:', error);
            message.error('Failed to rerun search');
        } finally {
            setLoadingSimilarLabels(false);
        }
    }, [labelToVerify, message]);

    const handleMergeComplete = () => {
        if (!mounted.current) return;
        message.success('Labels merged successfully');
        setModals(prev => ({...prev, merge: false}));
        refresh();
    };

    const handleRowClick = (record: LabelListItem) => {
        router.push(`/labels/view/${record.id}/${record.slug}`);
    };

    const labelColumns = useMemo(() => getLabelColumns({
        onVerifyClick: handleVerifyClick,
        onFindComparisons: handleFindComparisons,
        verifyingLabelId,
    }), [handleVerifyClick, handleFindComparisons, verifyingLabelId]);

    return (
        <>
            {error && (
                <ErrorAlert
                    error={error}
                    onClose={() => loadData()}
                />
            )}

            <TableContainer
                title="Labels"
                actions={
                    <Space size="middle">
                        <TableToolbar
                            searchTerm={searchTerm}
                            onSearch={setSearchTerm}
                            filterType={filterType || 'contains'}
                            onFilterTypeChange={setFilterType}
                            onFilterChange={setFilters}
                            onColumnChange={setVisibleColumns}
                            filterOptions={[]}
                            columnOptions={[...columnOptions]}
                            visibleColumns={visibleColumns}
                            activeFilters={filters}
                            searchPlaceholder="Search labels..."
                        />
                        <Button
                            type="primary"
                            icon={<PlusOutlined/>}
                            onClick={() => setModals(prev => ({...prev, add: true}))}
                        >
                            Add Label
                        </Button>
                    </Space>
                }
            >
                <EntityTable<LabelListItem>
                    columns={labelColumns}
                    data={data}
                    loading={loading}
                    currentPage={currentPage}
                    pageSize={pageSize}
                    total={total}
                    sortParams={sortParams}
                    visibleColumns={visibleColumns}
                    onTableChange={handleTableChange}
                    onRowClick={handleRowClick}
                />
            </TableContainer>

            <AddLabelModal
                open={modals.add}
                onCancel={() => setModals(prev => ({...prev, add: false}))}
                onSuccess={handleAddSuccess}
            />

            <SimilarEntitiesModal<SimilarLabel>
                open={modals.similarLabels}
                onCancel={() => setModals(prev => ({...prev, similarLabels: false}))}
                onSelect={handleSelectSimilarLabel}
                onProceed={handleProceedWithoutMerge}
                onMergeSelected={handleSelectLabelsToMerge}
                onRerunSearch={handleRerunSearch}
                similarEntities={similarLabels}
                entityName="label"
                searchedName={labelToVerify?.name || ''}
                loading={loadingSimilarLabels}
                mode="select-multiple"
                searchSettings={searchSettings}
                settingsStorageKey={SETTINGS_KEY}
                manualSearch={{
                    searchEntities: async (query) => {
                        const result = await fetchLabels({name: query, name_filter_type: 'contains', page: 1, page_size: 20});
                        return result.data;
                    },
                    mapToSimilar: (label) => ({id: label.id, name: label.name, similarity_score: 0}),
                    excludeId: labelToVerify?.id,
                }}
            />

            {labelToVerify && (
                <LabelMergeComparison
                    open={modals.merge}
                    onCancel={() => {
                        setModals(prev => ({...prev, merge: false, similarLabels: true}));
                    }}
                    originalLabelId={labelToVerify.id}
                    selectedLabelIds={selectedLabelsToMerge.map(l => l.id)}
                    onMergeComplete={handleMergeComplete}
                />
            )}
        </>
    );
}
