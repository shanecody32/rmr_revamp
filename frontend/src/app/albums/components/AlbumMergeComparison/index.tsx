'use client'

import {CloseCircleOutlined, SwapOutlined} from '@ant-design/icons';
import {Alert, Button, Modal, Radio, Spin, Tabs, Tooltip} from 'antd';
import {useCallback, useEffect, useState} from 'react';

import {mergeAlbums} from '@/lib/api/albums';
import {api} from '@/lib/api/config';
import type {AlbumMergeResult, AlbumResponse, AlbumWithRelationsResponse} from '@/types/api/albums';

import {FIELD_GROUPS} from './constants';
import ImageComparison from './ImageComparison';
import MergeFieldGroup from './MergeFieldGroup';
import MergeModalFooter from './MergeModalFooter';
import MergeModalHeader from './MergeModalHeader';
import MergePreview from './MergePreview';
import type {AlbumComparisonItem, MergeFieldValue} from './types';

interface AlbumMergeComparisonProps {
    open: boolean;
    onCancel: () => void;
    originalAlbumId: number;
    selectedAlbumIds: number[];
    onMergeComplete: (mergedAlbum: AlbumResponse) => void;
}

// Helper to check if a value is considered "has data"
const hasData = (value: any): boolean => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string' && value.trim() === '') return false;
    if (typeof value === 'boolean') return true; // booleans always have data
    return true;
};

export default function AlbumMergeComparison({
                                                 open,
                                                 onCancel,
                                                 originalAlbumId,
                                                 selectedAlbumIds: initialSelectedAlbumIds,
                                                 onMergeComplete
                                             }: AlbumMergeComparisonProps) {
    const [allAlbums, setAllAlbums] = useState<AlbumComparisonItem[]>([]);
    const [allAlbumIds, setAllAlbumIds] = useState<number[]>([]); // Track all album IDs for the merge
    const [primaryAlbumId, setPrimaryAlbumId] = useState<number>(originalAlbumId);
    const [selectedValues, setSelectedValues] = useState<Record<string, MergeFieldValue>>({});
    const [activeTab, setActiveTab] = useState<string>('basic');
    const [initialLoading, setInitialLoading] = useState(true);
    const [merging, setMerging] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [smartDefaultsApplied, setSmartDefaultsApplied] = useState(false);

    // Reset state when modal opens
    useEffect(() => {
        if (open) {
            // All album IDs = original album + selected albums
            const allIds = [originalAlbumId, ...initialSelectedAlbumIds.filter(id => id !== originalAlbumId)];
            setAllAlbumIds(allIds);
            setPrimaryAlbumId(originalAlbumId);
            setAllAlbums([]);
            setSelectedValues({});
            setInitialLoading(true);
            setSmartDefaultsApplied(false);
        }
    }, [initialSelectedAlbumIds, originalAlbumId, open]);

    // Load all album data (only when allAlbumIds changes, not when primaryAlbumId changes)
    useEffect(() => {
        if (!open || allAlbumIds.length === 0) return;

        const loadAlbums = async () => {
            setInitialLoading(true);
            setError(null);

            // Initialize album data structure
            const initialAlbums = allAlbumIds.map(id => ({
                id,
                name: `Album ${id}`,
                data: {} as AlbumWithRelationsResponse,
                loading: true,
                error: null
            }));

            setAllAlbums(initialAlbums);

            // Load all albums in parallel
            const results = await Promise.allSettled(
                allAlbumIds.map(id => api.get<AlbumWithRelationsResponse>(`/albums/${id}`).then(res => res.data))
            );

            const loadedAlbums = initialAlbums.map((album, index) => {
                const result = results[index];
                if (result.status === 'fulfilled') {
                    return {...album, name: result.value.name, data: result.value, loading: false, error: null};
                } else {
                    console.error(`Error loading album ${album.id}:`, result.reason);
                    return {...album, loading: false, error: 'Failed to load album data'};
                }
            });

            setAllAlbums(loadedAlbums);
            setInitialLoading(false);
        };

        loadAlbums();
    }, [open, allAlbumIds]);

    // Smart defaults: find best source for a field
    // Priority: 1. Album with data (if only one has data), 2. Primary album (if multiple have data or none have)
    const findBestSourceForField = useCallback((fieldKey: string): { value: any; sourceId: number } | null => {
        const albumsWithData: { album: AlbumComparisonItem; value: any }[] = [];
        const primaryAlbum = allAlbums.find(a => a.id === primaryAlbumId);

        for (const album of allAlbums) {
            if (album.loading || !album.data) continue;
            const value = album.data[fieldKey as keyof AlbumWithRelationsResponse];
            if (hasData(value)) {
                albumsWithData.push({album, value});
            }
        }

        // If exactly one album has data, use that
        if (albumsWithData.length === 1) {
            return {value: albumsWithData[0].value, sourceId: albumsWithData[0].album.id};
        }

        // If multiple albums have data or none have data, use primary album
        if (primaryAlbum && !primaryAlbum.loading && primaryAlbum.data) {
            const value = primaryAlbum.data[fieldKey as keyof AlbumWithRelationsResponse];
            return {value, sourceId: primaryAlbumId};
        }

        return null;
    }, [allAlbums, primaryAlbumId]);

    // Initialize selected values with smart defaults (only on initial load, not on primary change)
    useEffect(() => {
        if (!open || initialLoading || smartDefaultsApplied) return;

        const primaryAlbum = allAlbums.find(album => album.id === primaryAlbumId);
        if (!primaryAlbum || !primaryAlbum.data) return;

        const initialSelections: Record<string, MergeFieldValue> = {};

        // Initialize selections with smart defaults
        FIELD_GROUPS.forEach(group => {
            group.fields.forEach(field => {
                if (field.special) return;

                const best = findBestSourceForField(field.key);
                if (best) {
                    initialSelections[field.key] = best;
                }
            });
        });

        setSelectedValues(initialSelections);
        setSmartDefaultsApplied(true);
    }, [open, initialLoading, allAlbums, primaryAlbumId, findBestSourceForField, smartDefaultsApplied]);

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

            // Add all selected values to the merged data
            Object.entries(selectedValues).forEach(([key, data]) => {
                mergedData[key] = data.value;
            });

            // Albums to merge from (all albums except the primary)
            const fromIds = allAlbums
                .map(a => a.id)
                .filter(id => id !== primaryAlbumId);

            // Call the merge API
            const result: AlbumMergeResult = await mergeAlbums({
                from_ids: fromIds,
                into_id: primaryAlbumId,
                merged_data: mergedData
            });

            // Log merge stats for debugging
            console.log('Merge completed:', {
                stats: result.stats,
            });

            // Notify parent component about successful merge
            onMergeComplete(result.merged_album);

        } catch (err) {
            console.error('Error merging albums:', err);
            setError('Failed to merge albums. Please try again later.');
        } finally {
            setMerging(false);
        }
    };

    // Remove an album from the merge
    const handleRemoveAlbum = (albumId: number) => {
        // Don't allow removing if it's the only album left besides primary
        if (allAlbums.length <= 2) return;

        // If removing the primary album, set new primary to first remaining album
        let newPrimaryId = primaryAlbumId;
        if (albumId === primaryAlbumId) {
            const newPrimary = allAlbums.find(a => a.id !== albumId);
            if (newPrimary) {
                newPrimaryId = newPrimary.id;
                setPrimaryAlbumId(newPrimary.id);
            }
        }

        // Update all album IDs
        setAllAlbumIds(prev => prev.filter(id => id !== albumId));

        // Remove the album from allAlbums
        setAllAlbums(prev => prev.filter(album => album.id !== albumId));

        // Update selected values
        // If a field's source was the removed album, revert to primary album's value
        setSelectedValues(prev => {
            const updatedValues = {...prev};

            Object.entries(updatedValues).forEach(([key, value]) => {
                if (value.sourceId === albumId) {
                    // Find primary album's value for this field
                    const primaryAlbum = allAlbums.find(a => a.id === newPrimaryId);
                    if (primaryAlbum) {
                        updatedValues[key] = {
                            value: primaryAlbum.data[key as keyof AlbumWithRelationsResponse],
                            sourceId: newPrimaryId
                        };
                    }
                }
            });

            return updatedValues;
        });
    };

    // Change the primary album (the one that will be kept after merge)
    // Only swap fields whose current source was the old primary -- preserve user selections from other sources
    const handleChangePrimary = (newPrimaryId: number) => {
        const oldPrimaryId = primaryAlbumId;
        setPrimaryAlbumId(newPrimaryId);

        if (oldPrimaryId === newPrimaryId) return;

        const newPrimaryAlbum = allAlbums.find(a => a.id === newPrimaryId);
        if (!newPrimaryAlbum || !newPrimaryAlbum.data) return;

        setSelectedValues(prev => {
            const updated = {...prev};
            Object.entries(updated).forEach(([key, fieldValue]) => {
                if (fieldValue.sourceId === oldPrimaryId) {
                    updated[key] = {
                        value: newPrimaryAlbum.data[key as keyof AlbumWithRelationsResponse],
                        sourceId: newPrimaryId
                    };
                }
            });
            return updated;
        });
    };

    // Get the primary album for the preview
    const primaryAlbum = allAlbums.find(album => album.id === primaryAlbumId) || null;

    // Albums that will be merged into primary
    const mergingFromIds = allAlbums.map(a => a.id).filter(id => id !== primaryAlbumId);

    // Sort albums with primary first for display
    const sortedAlbums = [...allAlbums].sort((a, b) => {
        if (a.id === primaryAlbumId) return -1;
        if (b.id === primaryAlbumId) return 1;
        return 0;
    });

    // Show album list with primary selection and removal options
    const renderAlbumList = () => {
        return (
            <div className="mb-6 border rounded-md p-4 bg-blue-50">
                <div className="font-medium mb-2 flex items-center gap-2">
                    <span>Albums to be merged</span>
                    <Tooltip title="Select which album to keep as primary. The primary album's ID will be preserved, and other albums will be merged into it.">
                        <SwapOutlined className="text-blue-500 cursor-help" />
                    </Tooltip>
                </div>
                <div className="text-xs text-gray-500 mb-3">
                    Select the primary album to keep (all others will be merged into it)
                </div>
                <Radio.Group
                    value={primaryAlbumId}
                    onChange={(e) => handleChangePrimary(e.target.value)}
                    className="w-full"
                >
                    <div className="space-y-2">
                        {sortedAlbums.map(album => (
                            <div key={album.id} className={`flex justify-between items-center p-2 rounded border ${album.id === primaryAlbumId ? 'bg-blue-100 border-blue-300' : 'bg-white'}`}>
                                <Radio value={album.id} disabled={album.loading}>
                                    <span className={album.id === primaryAlbumId ? 'text-blue-600 font-medium' : ''}>
                                        {album.name}
                                    </span>
                                    {album.id === primaryAlbumId &&
                                        <span className="ml-2 text-xs text-blue-500 font-medium">(Primary - will be kept)</span>}
                                    {album.loading && <Spin size="small" className="ml-2"/>}
                                    {album.error && <span className="ml-2 text-xs text-red-500">Error loading</span>}
                                </Radio>
                                {allAlbums.length > 2 && (
                                    <Button
                                        type="text"
                                        danger
                                        icon={<CloseCircleOutlined/>}
                                        onClick={() => handleRemoveAlbum(album.id)}
                                        size="small"
                                    >
                                        Remove
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                </Radio.Group>

                {allAlbums.length < 2 && (
                    <Alert
                        className="mt-3"
                        type="warning"
                        message="You need at least 2 albums to perform a merge."
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
                    {renderAlbumList()}
                    <MergeFieldGroup
                        fieldGroup={FIELD_GROUPS.find(g => g.key === 'basic')!}
                        allAlbums={sortedAlbums}
                        primaryAlbumId={primaryAlbumId}
                        selectedValues={selectedValues}
                        onSelectValue={handleSelectValue}
                    />
                </>
            )
        },
        {
            key: 'details',
            label: 'Details',
            children: (
                <MergeFieldGroup
                    fieldGroup={FIELD_GROUPS.find(g => g.key === 'details')!}
                    allAlbums={sortedAlbums}
                    primaryAlbumId={primaryAlbumId}
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
                    allAlbums={sortedAlbums}
                    primaryAlbumId={primaryAlbumId}
                    selectedValues={selectedValues}
                    onSelectValue={handleSelectValue}
                />
            )
        },
        {
            key: 'classification',
            label: 'Classification',
            children: (
                <MergeFieldGroup
                    fieldGroup={FIELD_GROUPS.find(g => g.key === 'classification')!}
                    allAlbums={sortedAlbums}
                    primaryAlbumId={primaryAlbumId}
                    selectedValues={selectedValues}
                    onSelectValue={handleSelectValue}
                />
            )
        },
        {
            key: 'images',
            label: 'Images',
            children: <ImageComparison allAlbums={sortedAlbums} primaryAlbumId={primaryAlbumId}/>
        },
        {
            key: 'preview',
            label: 'Merge Preview',
            children: (
                <MergePreview
                    originalAlbum={primaryAlbum}
                    allAlbums={sortedAlbums}
                    selectedValues={selectedValues}
                    selectedAlbumIds={mergingFromIds}
                />
            )
        }
    ];

    return (
        <Modal
            title="Compare & Merge Albums"
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
                    disabled={initialLoading || allAlbums.length < 2 || Object.keys(selectedValues).length === 0}
                >
                    Merge Albums
                </Button>
            ]}
            width={1400}
            className="album-merge-modal"
        >
            {initialLoading ? (
                <div className="text-center py-12">
                    <Spin size="large"/>
                    <div className="mt-4">Loading album data...</div>
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

                    <MergeModalFooter allAlbums={allAlbums} primaryAlbumId={primaryAlbumId}/>
                </>
            )}

            <style jsx global>{`
        .album-merge-modal .merge-tabs .ant-tabs-nav {
          margin-bottom: 24px;
        }
        .album-merge-modal .ant-card-body {
          padding: 12px;
        }
        .album-merge-modal .image-card {
          transition: all 0.3s ease;
        }
        .album-merge-modal .image-card:hover {
          transform: scale(1.02);
        }
      `}</style>
        </Modal>
    );
}
