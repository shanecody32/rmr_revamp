'use client'

import {PlusOutlined} from '@ant-design/icons';
import {App, Button, Space, Table} from 'antd';
import {useRouter} from 'next/navigation';
import {useCallback, useState} from 'react';

import DetailDrawer from '@/components/common/data/DetailView/DetailDrawer';
import TableContainer from '@/components/common/data/tables/TableContainer';
import TableToolbar from '@/components/common/data/tables/TableToolbar';
import ErrorAlert from '@/components/common/feedback/ErrorAlert';
import SimilarEntitiesModal, {type SearchSettings, loadSavedSettings, defaultSearchSettings} from '@/components/common/modals/SimilarEntitiesModal';
import {columnOptions, getSongColumns} from '@/app/songs/components/songColumns';
import {useColumnVisibility} from '@/hooks/useColumnVisibility';
import {useDetailDrawer} from '@/hooks/useDetailDrawer';
import {useTableData} from '@/hooks/useTableData';
import {fetchSongs, fetchSimilarSongs, type SimilarSong} from '@/lib/api/songs';
import type {SongResponse} from '@/types/api';

import AddSongModal from './AddSongModal';

const SETTINGS_KEY = 'song-similarity-search-settings';

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
    const router = useRouter();
    const {message} = App.useApp();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [verifyingSongId, setVerifyingSongId] = useState<number | null>(null);
    const [similarSongsModalOpen, setSimilarSongsModalOpen] = useState(false);
    const [similarSongs, setSimilarSongs] = useState<SimilarSong[]>([]);
    const [songToVerify, setSongToVerify] = useState<SongResponse | null>(null);
    const [loadingSimilarSongs, setLoadingSimilarSongs] = useState(false);
    const [searchSettings, setSearchSettings] = useState<SearchSettings>(() => ({
        ...loadSavedSettings(SETTINGS_KEY),
    }));

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

    // Handle verify button click — searches for similar songs first
    const handleVerifyClick = useCallback(async (song: SongResponse, forceModal = false) => {
        try {
            setLoadingSimilarSongs(true);
            setVerifyingSongId(song.id);
            setSongToVerify(song);

            const similar = await fetchSimilarSongs({
                search_term: song.name,
                existing_id: song.id,
                band_id: song.band_id,
                jw_weight: searchSettings.jw_weight,
                dice_weight: searchSettings.dice_weight,
                min_similarity: searchSettings.min_similarity,
                limit: searchSettings.limit,
                restrict_to_parent: searchSettings.restrict_to_parent,
            });

            const filtered = similar.filter(s => s.id !== song.id);
            setSimilarSongs(filtered);

            // If no similar songs found and not forced, go directly to validation page
            if (!forceModal && filtered.length === 0) {
                router.push(`/system/validation/song/${song.id}/${song.slug}`);
                return;
            }

            setSimilarSongsModalOpen(true);
        } catch (error) {
            console.error('Error fetching similar songs:', error);
            message.error('Failed to find similar songs');
            if (forceModal) {
                setSimilarSongs([]);
                setSimilarSongsModalOpen(true);
            }
        } finally {
            setLoadingSimilarSongs(false);
            setVerifyingSongId(null);
        }
    }, [searchSettings, router, message]);

    // Force show comparisons modal (always shows even with no results)
    const handleFindComparisons = useCallback(async (song: SongResponse) => {
        await handleVerifyClick(song, true);
    }, [handleVerifyClick]);

    // Handle selecting a song from similar songs modal
    const handleSelectSimilarSong = (song: SimilarSong) => {
        router.push(`/songs/view/${song.id}/${song.name}`);
        setSimilarSongsModalOpen(false);
    };

    // Handle proceeding without merging — go to validation page
    const handleProceedWithoutMerge = () => {
        if (!songToVerify) return;
        router.push(`/system/validation/song/${songToVerify.id}/${songToVerify.slug}`);
        setSimilarSongsModalOpen(false);
    };

    // Handle selecting songs to merge
    const handleMergeSelected = (selectedSongs: SimilarSong[]) => {
        if (!songToVerify) return;
        router.push(`/songs/edit/${songToVerify.id}/${songToVerify.slug}`);
        setSimilarSongsModalOpen(false);
        message.info(`Selected ${selectedSongs.length} song(s) for merge — merge comparison coming soon`);
    };

    // Handle rerunning search with new settings
    const handleRerunSearch = useCallback(async (settings: SearchSettings) => {
        if (!songToVerify) return;

        try {
            setLoadingSimilarSongs(true);
            setSearchSettings(settings);

            const similar = await fetchSimilarSongs({
                search_term: songToVerify.name,
                existing_id: songToVerify.id,
                band_id: songToVerify.band_id,
                jw_weight: settings.jw_weight,
                dice_weight: settings.dice_weight,
                min_similarity: settings.min_similarity,
                limit: settings.limit,
                restrict_to_parent: settings.restrict_to_parent,
            });

            setSimilarSongs(similar.filter(s => s.id !== songToVerify.id));
        } catch (error) {
            console.error('Error fetching similar songs:', error);
            message.error('Failed to rerun search');
        } finally {
            setLoadingSimilarSongs(false);
        }
    }, [songToVerify, message]);

    const columns = getSongColumns({
        onVerifyClick: handleVerifyClick,
        onFindComparisons: handleFindComparisons,
        verifyingSongId,
    });

    const visibleSongColumns = columns.filter(col =>
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
                            columnOptions={[...columnOptions]}
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

            <SimilarEntitiesModal<SimilarSong>
                open={similarSongsModalOpen}
                onCancel={() => setSimilarSongsModalOpen(false)}
                onSelect={handleSelectSimilarSong}
                onProceed={handleProceedWithoutMerge}
                onMergeSelected={handleMergeSelected}
                onRerunSearch={handleRerunSearch}
                similarEntities={similarSongs}
                entityName="song"
                searchedName={songToVerify?.name || ''}
                loading={loadingSimilarSongs}
                mode="select-multiple"
                searchSettings={searchSettings}
                settingsStorageKey={SETTINGS_KEY}
                manualSearch={{
                    searchEntities: async (query) => {
                        const result = await fetchSongs({name: query, name_filter_type: 'contains', page: 1, page_size: 20});
                        return result.data;
                    },
                    mapToSimilar: (song) => ({id: song.id, name: song.name, similarity_score: 0}),
                    excludeId: songToVerify?.id,
                }}
            />
        </>
    );
}
