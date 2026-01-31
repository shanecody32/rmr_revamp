'use client'

import {CloseCircleOutlined, SwapOutlined} from '@ant-design/icons';
import {Alert, Button, Modal, Radio, Spin, Tabs, Tooltip} from 'antd';
import {useCallback, useEffect, useState} from 'react';

import LocationDisplay from '@/components/common/data/LocationDisplay';
import {fetchBandDetail, mergeBands} from '@/lib/api/bands';
import type {BandWithDiscographyResponse, MergeResult} from '@/types/api/bands';

import {FIELD_GROUPS} from './constants';
import DiscographyComparison from './DiscographyComparison';
import ImageComparison from './ImageComparison';
import MergeFieldGroup from './MergeFieldGroup';
import MergeModalFooter from './MergeModalFooter';
import MergeModalHeader from './MergeModalHeader';
import MergePreview from './MergePreview';
import type {BandComparisonItem, MergeFieldValue} from './types';

interface BandMergeComparisonProps {
    open: boolean;
    onCancel: () => void;
    originalBandId: number;
    selectedBandIds: number[];
    onMergeComplete: (mergedBand: BandWithDiscographyResponse) => void;
}

// Helper to check if a value is considered "has data"
const hasData = (value: any): boolean => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string' && value.trim() === '') return false;
    if (typeof value === 'boolean') return true; // booleans always have data
    return true;
};

export default function BandMergeComparison({
                                                open,
                                                onCancel,
                                                originalBandId,
                                                selectedBandIds: initialSelectedBandIds,
                                                onMergeComplete
                                            }: BandMergeComparisonProps) {
    const [allBands, setAllBands] = useState<BandComparisonItem[]>([]);
    const [allBandIds, setAllBandIds] = useState<number[]>([]); // Track all band IDs for the merge
    const [primaryBandId, setPrimaryBandId] = useState<number>(originalBandId);
    const [selectedValues, setSelectedValues] = useState<Record<string, MergeFieldValue>>({});
    const [activeTab, setActiveTab] = useState<string>('basic');
    const [initialLoading, setInitialLoading] = useState(true);
    const [merging, setMerging] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reset state when modal opens
    useEffect(() => {
        if (open) {
            // All band IDs = original band + selected bands
            const allIds = [originalBandId, ...initialSelectedBandIds.filter(id => id !== originalBandId)];
            setAllBandIds(allIds);
            setPrimaryBandId(originalBandId);
            setAllBands([]);
            setSelectedValues({});
            setInitialLoading(true);
            setSmartDefaultsApplied(false);
        }
    }, [initialSelectedBandIds, originalBandId, open]);

    // Load all band data (only when allBandIds changes, not when primaryBandId changes)
    useEffect(() => {
        if (!open || allBandIds.length === 0) return;

        const loadBands = async () => {
            setInitialLoading(true);
            setError(null);

            // Initialize band data structure
            const initialBands = allBandIds.map(id => ({
                id,
                name: `Band ${id}`,
                data: {} as BandWithDiscographyResponse,
                loading: true,
                error: null
            }));

            setAllBands(initialBands);

            // Load all bands in parallel
            const results = await Promise.allSettled(
                allBandIds.map(id => fetchBandDetail(id, { includeAlbums: true }))
            );

            const loadedBands = initialBands.map((band, index) => {
                const result = results[index];
                if (result.status === 'fulfilled') {
                    return {...band, name: result.value.name, data: result.value, loading: false, error: null};
                } else {
                    console.error(`Error loading band ${band.id}:`, result.reason);
                    return {...band, loading: false, error: 'Failed to load band data'};
                }
            });

            setAllBands(loadedBands);
            setInitialLoading(false);
        };

        loadBands();
    }, [open, allBandIds]);

    // Smart defaults: find best source for a field
    // Priority: 1. Band with data (if only one has data), 2. Primary band (if multiple have data or none have)
    const findBestSourceForField = useCallback((fieldKey: string): { value: any; sourceId: number } | null => {
        const bandsWithData: { band: BandComparisonItem; value: any }[] = [];
        const primaryBand = allBands.find(b => b.id === primaryBandId);

        for (const band of allBands) {
            if (band.loading || !band.data) continue;
            const value = band.data[fieldKey as keyof BandWithDiscographyResponse];
            if (hasData(value)) {
                bandsWithData.push({ band, value });
            }
        }

        // If exactly one band has data, use that
        if (bandsWithData.length === 1) {
            return { value: bandsWithData[0].value, sourceId: bandsWithData[0].band.id };
        }

        // If multiple bands have data or none have data, use primary band
        if (primaryBand && !primaryBand.loading && primaryBand.data) {
            const value = primaryBand.data[fieldKey as keyof BandWithDiscographyResponse];
            return { value, sourceId: primaryBandId };
        }

        return null;
    }, [allBands, primaryBandId]);

    // Initialize selected values with smart defaults (only on initial load, not on primary change)
    const [smartDefaultsApplied, setSmartDefaultsApplied] = useState(false);

    useEffect(() => {
        if (!open || initialLoading || smartDefaultsApplied) return;

        const primaryBand = allBands.find(band => band.id === primaryBandId);
        if (!primaryBand || !primaryBand.data) return;

        const initialSelections: Record<string, MergeFieldValue> = {};

        // Initialize selections with smart defaults
        FIELD_GROUPS.forEach(group => {
            group.fields.forEach(field => {
                // Skip special fields like location_display (handled separately below)
                if (field.special) return;

                const best = findBestSourceForField(field.key);
                if (best) {
                    initialSelections[field.key] = best;
                }
            });
        });

        // Handle location (country_id, state_id, city_id) as a group - smart defaults
        const bandsWithLocation = allBands.filter(band =>
            !band.loading && band.data &&
            (band.data.country_id || band.data.state_id || band.data.city_id)
        );

        let locationSource = primaryBand;
        if (bandsWithLocation.length === 1) {
            locationSource = bandsWithLocation[0];
        }

        if (locationSource && locationSource.data) {
            initialSelections.country_id = {value: locationSource.data.country_id, sourceId: locationSource.id};
            initialSelections.state_id = {value: locationSource.data.state_id, sourceId: locationSource.id};
            initialSelections.city_id = {value: locationSource.data.city_id, sourceId: locationSource.id};
        }

        setSelectedValues(initialSelections);
        setSmartDefaultsApplied(true);
    }, [open, initialLoading, allBands, primaryBandId, findBestSourceForField, smartDefaultsApplied]);

    const handleSelectValue = useCallback((fieldKey: string, value: any, sourceId: number) => {
        if (fieldKey === 'location_display') {
            // When selecting location, we need to set country_id, state_id, and city_id
            const selectedBand = allBands.find(b => b.id === sourceId);
            if (!selectedBand) return;

            setSelectedValues(prev => ({
                ...prev,
                country_id: {value: selectedBand.data.country_id, sourceId},
                state_id: {value: selectedBand.data.state_id, sourceId},
                city_id: {value: selectedBand.data.city_id, sourceId}
            }));
        } else {
            // Normal field selection
            setSelectedValues(prev => ({
                ...prev,
                [fieldKey]: {value, sourceId}
            }));
        }
    }, [allBands]);

    const handleMerge = async () => {
        try {
            setMerging(true);
            setError(null);

            // Prepare the merged data object
            const mergedData: Partial<BandWithDiscographyResponse> = {};

            // Add all selected values to the merged data
            Object.entries(selectedValues).forEach(([key, data]) => {
                mergedData[key as keyof BandWithDiscographyResponse] = data.value;
            });

            // Bands to merge from (all bands except the primary)
            const fromIds = allBands
                .map(b => b.id)
                .filter(id => id !== primaryBandId);

            // Call the merge API
            const result: MergeResult = await mergeBands({
                from_ids: fromIds,
                into_id: primaryBandId,
                merged_data: mergedData
            });

            // Log merge stats for debugging
            console.log('Merge completed:', {
                stats: result.stats,
                duplicateSongs: result.duplicate_songs.length,
                duplicateAlbums: result.duplicate_albums.length,
            });

            // Notify parent component about successful merge
            // Extract merged_band from the MergeResult
            onMergeComplete(result.merged_band as BandWithDiscographyResponse);

        } catch (err) {
            console.error('Error merging bands:', err);
            setError('Failed to merge bands. Please try again later.');
        } finally {
            setMerging(false);
        }
    };

    // Remove a band from the merge
    const handleRemoveBand = (bandId: number) => {
        // Don't allow removing if it's the only band left besides primary
        if (allBands.length <= 2) return;

        // If removing the primary band, set new primary to first remaining band
        let newPrimaryId = primaryBandId;
        if (bandId === primaryBandId) {
            const newPrimary = allBands.find(b => b.id !== bandId);
            if (newPrimary) {
                newPrimaryId = newPrimary.id;
                setPrimaryBandId(newPrimary.id);
            }
        }

        // Update all band IDs
        setAllBandIds(prev => prev.filter(id => id !== bandId));

        // Remove the band from allBands
        setAllBands(prev => prev.filter(band => band.id !== bandId));

        // Update selected values
        // If a field's source was the removed band, revert to primary band's value
        setSelectedValues(prev => {
            const updatedValues = {...prev};

            Object.entries(updatedValues).forEach(([key, value]) => {
                if (value.sourceId === bandId) {
                    // Find primary band's value for this field
                    const primaryBand = allBands.find(b => b.id === newPrimaryId);
                    if (primaryBand) {
                        updatedValues[key] = {
                            value: primaryBand.data[key as keyof BandWithDiscographyResponse],
                            sourceId: newPrimaryId
                        };
                    }
                }
            });

            return updatedValues;
        });
    };

    // Change the primary band (the one that will be kept after merge)
    // Only swap fields whose current source was the old primary — preserve user selections from other sources
    const handleChangePrimary = (newPrimaryId: number) => {
        const oldPrimaryId = primaryBandId;
        setPrimaryBandId(newPrimaryId);

        if (oldPrimaryId === newPrimaryId) return;

        const newPrimaryBand = allBands.find(b => b.id === newPrimaryId);
        if (!newPrimaryBand || !newPrimaryBand.data) return;

        setSelectedValues(prev => {
            const updated = {...prev};
            Object.entries(updated).forEach(([key, fieldValue]) => {
                if (fieldValue.sourceId === oldPrimaryId) {
                    updated[key] = {
                        value: newPrimaryBand.data[key as keyof BandWithDiscographyResponse],
                        sourceId: newPrimaryId
                    };
                }
            });
            return updated;
        });
    };

    // Render function for special fields
    const renderSpecialField = useCallback((field: string, band: BandComparisonItem) => {
        if (field === 'location') {
            return (
                <LocationDisplay
                    countryId={band.data.country_id}
                    stateId={band.data.state_id}
                    cityId={band.data.city_id}
                />
            );
        }
        return null;
    }, []);

    // Get the primary band for the preview
    const primaryBand = allBands.find(band => band.id === primaryBandId) || null;

    // Bands that will be merged into primary
    const mergingFromIds = allBands.map(b => b.id).filter(id => id !== primaryBandId);

    // Sort bands with primary first for display
    const sortedBands = [...allBands].sort((a, b) => {
        if (a.id === primaryBandId) return -1;
        if (b.id === primaryBandId) return 1;
        return 0;
    });

    // Show band list with primary selection and removal options
    const renderBandList = () => {
        return (
            <div className="mb-6 border rounded-md p-4 bg-blue-50">
                <div className="font-medium mb-2 flex items-center gap-2">
                    <span>Bands to be merged</span>
                    <Tooltip title="Select which band to keep as primary. The primary band's ID will be preserved, and other bands will be merged into it.">
                        <SwapOutlined className="text-blue-500 cursor-help" />
                    </Tooltip>
                </div>
                <div className="text-xs text-gray-500 mb-3">
                    Select the primary band to keep (all others will be merged into it)
                </div>
                <Radio.Group
                    value={primaryBandId}
                    onChange={(e) => handleChangePrimary(e.target.value)}
                    className="w-full"
                >
                    <div className="space-y-2">
                        {sortedBands.map(band => (
                            <div key={band.id} className={`flex justify-between items-center p-2 rounded border ${band.id === primaryBandId ? 'bg-blue-100 border-blue-300' : 'bg-white'}`}>
                                <Radio value={band.id} disabled={band.loading}>
                                    <span className={band.id === primaryBandId ? 'text-blue-600 font-medium' : ''}>
                                        {band.name}
                                    </span>
                                    {band.id === primaryBandId &&
                                        <span className="ml-2 text-xs text-blue-500 font-medium">(Primary - will be kept)</span>}
                                    {band.loading && <Spin size="small" className="ml-2"/>}
                                    {band.error && <span className="ml-2 text-xs text-red-500">Error loading</span>}
                                </Radio>
                                {allBands.length > 2 && (
                                    <Button
                                        type="text"
                                        danger
                                        icon={<CloseCircleOutlined/>}
                                        onClick={() => handleRemoveBand(band.id)}
                                        size="small"
                                    >
                                        Remove
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                </Radio.Group>

                {allBands.length < 2 && (
                    <Alert
                        className="mt-3"
                        type="warning"
                        message="You need at least 2 bands to perform a merge."
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
                    {renderBandList()}
                    <MergeFieldGroup
                        fieldGroup={FIELD_GROUPS.find(g => g.key === 'basic')!}
                        allBands={sortedBands}
                        primaryBandId={primaryBandId}
                        selectedValues={selectedValues}
                        onSelectValue={handleSelectValue}
                        renderSpecialField={renderSpecialField}
                    />
                </>
            )
        },
        {
            key: 'location',
            label: 'Location',
            children: (
                <MergeFieldGroup
                    fieldGroup={FIELD_GROUPS.find(g => g.key === 'location')!}
                    allBands={sortedBands}
                    primaryBandId={primaryBandId}
                    selectedValues={selectedValues}
                    onSelectValue={handleSelectValue}
                    renderSpecialField={renderSpecialField}
                />
            )
        },
        {
            key: 'contact',
            label: 'Contact & Social',
            children: (
                <>
                    <MergeFieldGroup
                        fieldGroup={FIELD_GROUPS.find(g => g.key === 'contact')!}
                        allBands={sortedBands}
                        primaryBandId={primaryBandId}
                        selectedValues={selectedValues}
                        onSelectValue={handleSelectValue}
                    />
                    <MergeFieldGroup
                        fieldGroup={FIELD_GROUPS.find(g => g.key === 'social')!}
                        allBands={sortedBands}
                        primaryBandId={primaryBandId}
                        selectedValues={selectedValues}
                        onSelectValue={handleSelectValue}
                    />
                </>
            )
        },
        {
            key: 'ids',
            label: 'External IDs',
            children: (
                <MergeFieldGroup
                    fieldGroup={FIELD_GROUPS.find(g => g.key === 'ids')!}
                    allBands={sortedBands}
                    primaryBandId={primaryBandId}
                    selectedValues={selectedValues}
                    onSelectValue={handleSelectValue}
                />
            )
        },
        {
            key: 'images',
            label: 'Images',
            children: <ImageComparison allBands={sortedBands} primaryBandId={primaryBandId}/>
        },
        {
            key: 'discography',
            label: 'Discography',
            children: <DiscographyComparison allBands={sortedBands} primaryBandId={primaryBandId}/>
        },
        {
            key: 'preview',
            label: 'Merge Preview',
            children: (
                <MergePreview
                    originalBand={primaryBand}
                    allBands={sortedBands}
                    selectedValues={selectedValues}
                    selectedBandIds={mergingFromIds}
                />
            )
        }
    ];

    return (
        <Modal
            title="Compare & Merge Bands"
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
                    disabled={initialLoading || allBands.length < 2 || Object.keys(selectedValues).length === 0}
                >
                    Merge Bands
                </Button>
            ]}
            width={1400}
            className="band-merge-modal"
        >
            {initialLoading ? (
                <div className="text-center py-12">
                    <Spin size="large"/>
                    <div className="mt-4">Loading band data...</div>
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

                    <MergeModalFooter allBands={allBands} primaryBandId={primaryBandId}/>
                </>
            )}

            <style jsx global>{`
        .band-merge-modal .merge-tabs .ant-tabs-nav {
          margin-bottom: 24px;
        }
        .band-merge-modal .ant-card-body {
          padding: 12px;
        }
        .band-merge-modal .album-card {
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        .band-merge-modal .image-card {
          transition: all 0.3s ease;
        }
        .band-merge-modal .image-card:hover {
          transform: scale(1.02);
        }
      `}</style>
        </Modal>
    );
}
