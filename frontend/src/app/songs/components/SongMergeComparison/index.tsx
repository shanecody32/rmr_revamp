'use client'

import {CloseCircleOutlined, SwapOutlined} from '@ant-design/icons';
import {Alert, Button, Modal, Radio, Spin, Tabs, Tooltip} from 'antd';
import {useCallback, useEffect, useState} from 'react';

import {mergeSongs} from '@/lib/api/songs';
import {api} from '@/lib/api/config';
import type {SongResponse, SongMergeResult} from '@/types/api/songs';

import {FIELD_GROUPS} from './constants';
import MergeFieldGroup from './MergeFieldGroup';
import MergeModalFooter from './MergeModalFooter';
import MergeModalHeader from './MergeModalHeader';
import MergePreview from './MergePreview';
import type {SongComparisonItem, MergeFieldValue} from './types';

interface SongMergeComparisonProps {
    open: boolean;
    onCancel: () => void;
    originalSongId: number;
    selectedSongIds: number[];
    onMergeComplete: (mergedSong: SongResponse) => void;
}

// Helper to check if a value is considered "has data"
const hasData = (value: any): boolean => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string' && value.trim() === '') return false;
    if (typeof value === 'boolean') return true;
    return true;
};

export default function SongMergeComparison({
                                                open,
                                                onCancel,
                                                originalSongId,
                                                selectedSongIds: initialSelectedSongIds,
                                                onMergeComplete
                                            }: SongMergeComparisonProps) {
    const [allSongs, setAllSongs] = useState<SongComparisonItem[]>([]);
    const [allSongIds, setAllSongIds] = useState<number[]>([]);
    const [primarySongId, setPrimarySongId] = useState<number>(originalSongId);
    const [selectedValues, setSelectedValues] = useState<Record<string, MergeFieldValue>>({});
    const [activeTab, setActiveTab] = useState<string>('basic');
    const [initialLoading, setInitialLoading] = useState(true);
    const [merging, setMerging] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [smartDefaultsApplied, setSmartDefaultsApplied] = useState(false);

    // Reset state when modal opens
    useEffect(() => {
        if (open) {
            const allIds = [originalSongId, ...initialSelectedSongIds.filter(id => id !== originalSongId)];
            setAllSongIds(allIds);
            setPrimarySongId(originalSongId);
            setAllSongs([]);
            setSelectedValues({});
            setInitialLoading(true);
            setSmartDefaultsApplied(false);
        }
    }, [initialSelectedSongIds, originalSongId, open]);

    // Load all song data
    useEffect(() => {
        if (!open || allSongIds.length === 0) return;

        const loadSongs = async () => {
            setInitialLoading(true);
            setError(null);

            const initialSongs = allSongIds.map(id => ({
                id,
                name: `Song ${id}`,
                data: {} as SongResponse,
                loading: true,
                error: null
            }));

            setAllSongs(initialSongs);

            // Load all songs in parallel
            const results = await Promise.allSettled(
                allSongIds.map(id => api.get<SongResponse>(`/songs/${id}`).then(res => res.data))
            );

            const loadedSongs = initialSongs.map((song, index) => {
                const result = results[index];
                if (result.status === 'fulfilled') {
                    return {...song, name: result.value.name, data: result.value, loading: false, error: null};
                } else {
                    console.error(`Error loading song ${song.id}:`, result.reason);
                    return {...song, loading: false, error: 'Failed to load song data'};
                }
            });

            setAllSongs(loadedSongs);
            setInitialLoading(false);
        };

        loadSongs();
    }, [open, allSongIds]);

    // Smart defaults: find best source for a field
    const findBestSourceForField = useCallback((fieldKey: string): { value: any; sourceId: number } | null => {
        const songsWithData: { song: SongComparisonItem; value: any }[] = [];
        const primarySong = allSongs.find(s => s.id === primarySongId);

        for (const song of allSongs) {
            if (song.loading || !song.data) continue;
            const value = song.data[fieldKey as keyof SongResponse];
            if (hasData(value)) {
                songsWithData.push({song, value});
            }
        }

        // If exactly one song has data, use that
        if (songsWithData.length === 1) {
            return {value: songsWithData[0].value, sourceId: songsWithData[0].song.id};
        }

        // If multiple songs have data or none have data, use primary song
        if (primarySong && !primarySong.loading && primarySong.data) {
            const value = primarySong.data[fieldKey as keyof SongResponse];
            return {value, sourceId: primarySongId};
        }

        return null;
    }, [allSongs, primarySongId]);

    // Initialize selected values with smart defaults
    useEffect(() => {
        if (!open || initialLoading || smartDefaultsApplied) return;

        const primarySong = allSongs.find(song => song.id === primarySongId);
        if (!primarySong || !primarySong.data) return;

        const initialSelections: Record<string, MergeFieldValue> = {};

        FIELD_GROUPS.forEach(group => {
            group.fields.forEach(field => {
                const best = findBestSourceForField(field.key);
                if (best) {
                    initialSelections[field.key] = best;
                }
            });
        });

        setSelectedValues(initialSelections);
        setSmartDefaultsApplied(true);
    }, [open, initialLoading, allSongs, primarySongId, findBestSourceForField, smartDefaultsApplied]);

    const handleSelectValue = useCallback((fieldKey: string, value: any, sourceId: number) => {
        setSelectedValues(prev => ({
            ...prev,
            [fieldKey]: {value, sourceId}
        }));
    }, []);

    const handleMerge = async () => {
        try {
            setMerging(true);
            setError(null);

            // Prepare the merged data object
            const mergedData: Record<string, unknown> = {};

            Object.entries(selectedValues).forEach(([key, data]) => {
                mergedData[key] = data.value;
            });

            // Songs to merge from (all songs except the primary)
            const fromIds = allSongs
                .map(s => s.id)
                .filter(id => id !== primarySongId);

            // Call the merge API
            const result: SongMergeResult = await mergeSongs({
                from_ids: fromIds,
                into_id: primarySongId,
                merged_data: mergedData
            });

            // Log merge stats for debugging
            console.log('Song merge completed:', {
                stats: result.stats,
            });

            // Notify parent component about successful merge
            onMergeComplete(result.merged_song);

        } catch (err) {
            console.error('Error merging songs:', err);
            setError('Failed to merge songs. Please try again later.');
        } finally {
            setMerging(false);
        }
    };

    // Remove a song from the merge
    const handleRemoveSong = (songId: number) => {
        if (allSongs.length <= 2) return;

        let newPrimaryId = primarySongId;
        if (songId === primarySongId) {
            const newPrimary = allSongs.find(s => s.id !== songId);
            if (newPrimary) {
                newPrimaryId = newPrimary.id;
                setPrimarySongId(newPrimary.id);
            }
        }

        setAllSongIds(prev => prev.filter(id => id !== songId));
        setAllSongs(prev => prev.filter(song => song.id !== songId));

        // Update selected values - revert fields sourced from removed song to primary
        setSelectedValues(prev => {
            const updatedValues = {...prev};

            Object.entries(updatedValues).forEach(([key, value]) => {
                if (value.sourceId === songId) {
                    const primarySong = allSongs.find(s => s.id === newPrimaryId);
                    if (primarySong) {
                        updatedValues[key] = {
                            value: primarySong.data[key as keyof SongResponse],
                            sourceId: newPrimaryId
                        };
                    }
                }
            });

            return updatedValues;
        });
    };

    // Change the primary song
    const handleChangePrimary = (newPrimaryId: number) => {
        const oldPrimaryId = primarySongId;
        setPrimarySongId(newPrimaryId);

        if (oldPrimaryId === newPrimaryId) return;

        const newPrimarySong = allSongs.find(s => s.id === newPrimaryId);
        if (!newPrimarySong || !newPrimarySong.data) return;

        setSelectedValues(prev => {
            const updated = {...prev};
            Object.entries(updated).forEach(([key, fieldValue]) => {
                if (fieldValue.sourceId === oldPrimaryId) {
                    updated[key] = {
                        value: newPrimarySong.data[key as keyof SongResponse],
                        sourceId: newPrimaryId
                    };
                }
            });
            return updated;
        });
    };

    // Get the primary song for the preview
    const primarySong = allSongs.find(song => song.id === primarySongId) || null;

    // Songs that will be merged into primary
    const mergingFromIds = allSongs.map(s => s.id).filter(id => id !== primarySongId);

    // Sort songs with primary first for display
    const sortedSongs = [...allSongs].sort((a, b) => {
        if (a.id === primarySongId) return -1;
        if (b.id === primarySongId) return 1;
        return 0;
    });

    // Show song list with primary selection and removal options
    const renderSongList = () => {
        return (
            <div className="mb-6 border rounded-md p-4 bg-blue-50">
                <div className="font-medium mb-2 flex items-center gap-2">
                    <span>Songs to be merged</span>
                    <Tooltip title="Select which song to keep as primary. The primary song's ID will be preserved, and other songs will be merged into it.">
                        <SwapOutlined className="text-blue-500 cursor-help" />
                    </Tooltip>
                </div>
                <div className="text-xs text-gray-500 mb-3">
                    Select the primary song to keep (all others will be merged into it)
                </div>
                <Radio.Group
                    value={primarySongId}
                    onChange={(e) => handleChangePrimary(e.target.value)}
                    className="w-full"
                >
                    <div className="space-y-2">
                        {sortedSongs.map(song => (
                            <div key={song.id} className={`flex justify-between items-center p-2 rounded border ${song.id === primarySongId ? 'bg-blue-100 border-blue-300' : 'bg-white'}`}>
                                <Radio value={song.id} disabled={song.loading}>
                                    <span className={song.id === primarySongId ? 'text-blue-600 font-medium' : ''}>
                                        {song.name}
                                    </span>
                                    {song.id === primarySongId &&
                                        <span className="ml-2 text-xs text-blue-500 font-medium">(Primary - will be kept)</span>}
                                    {song.loading && <Spin size="small" className="ml-2"/>}
                                    {song.error && <span className="ml-2 text-xs text-red-500">Error loading</span>}
                                </Radio>
                                {allSongs.length > 2 && (
                                    <Button
                                        type="text"
                                        danger
                                        icon={<CloseCircleOutlined/>}
                                        onClick={() => handleRemoveSong(song.id)}
                                        size="small"
                                    >
                                        Remove
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                </Radio.Group>

                {allSongs.length < 2 && (
                    <Alert
                        className="mt-3"
                        type="warning"
                        message="You need at least 2 songs to perform a merge."
                        showIcon
                    />
                )}
            </div>
        );
    };

    const tabItems = [
        {
            key: 'basic',
            label: 'Basic Info',
            children: (
                <>
                    {renderSongList()}
                    <MergeFieldGroup
                        fieldGroup={FIELD_GROUPS.find(g => g.key === 'basic')!}
                        allSongs={sortedSongs}
                        primarySongId={primarySongId}
                        selectedValues={selectedValues}
                        onSelectValue={handleSelectValue}
                    />
                </>
            )
        },
        {
            key: 'metadata',
            label: 'Metadata',
            children: (
                <MergeFieldGroup
                    fieldGroup={FIELD_GROUPS.find(g => g.key === 'metadata')!}
                    allSongs={sortedSongs}
                    primarySongId={primarySongId}
                    selectedValues={selectedValues}
                    onSelectValue={handleSelectValue}
                />
            )
        },
        {
            key: 'external',
            label: 'External IDs',
            children: (
                <MergeFieldGroup
                    fieldGroup={FIELD_GROUPS.find(g => g.key === 'external')!}
                    allSongs={sortedSongs}
                    primarySongId={primarySongId}
                    selectedValues={selectedValues}
                    onSelectValue={handleSelectValue}
                />
            )
        },
        {
            key: 'preview',
            label: 'Merge Preview',
            children: (
                <MergePreview
                    originalSong={primarySong}
                    allSongs={sortedSongs}
                    selectedValues={selectedValues}
                    selectedSongIds={mergingFromIds}
                />
            )
        }
    ];

    return (
        <Modal
            title="Compare & Merge Songs"
            open={open}
            onCancel={onCancel}
            footer={[
                <Button key="back" onClick={onCancel} disabled={merging}>
                    Cancel
                </Button>,
                <Button
                    key="merge"
                    type="primary"
                    onClick={handleMerge}
                    loading={merging}
                    disabled={initialLoading || allSongs.length < 2 || Object.keys(selectedValues).length === 0}
                >
                    Merge Songs
                </Button>
            ]}
            width={1400}
            className="song-merge-modal"
        >
            {initialLoading ? (
                <div className="text-center py-12">
                    <Spin size="large"/>
                    <div className="mt-4">Loading song data...</div>
                </div>
            ) : (
                <>
                    <MergeModalHeader error={error}/>

                    <Tabs
                        activeKey={activeTab}
                        onChange={setActiveTab}
                        className="merge-tabs"
                        items={tabItems}
                    />

                    <MergeModalFooter allSongs={allSongs} primarySongId={primarySongId}/>
                </>
            )}

            <style jsx global>{`
                .song-merge-modal .merge-tabs .ant-tabs-nav {
                    margin-bottom: 24px;
                }
                .song-merge-modal .ant-card-body {
                    padding: 12px;
                }
            `}</style>
        </Modal>
    );
}
