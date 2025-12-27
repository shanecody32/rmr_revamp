'use client'

import {CloseCircleOutlined} from '@ant-design/icons';
import {Alert, Button, Modal, Spin, Tabs} from 'antd';
import {useEffect, useState} from 'react';

import LocationDisplay from '@/components/common/data/LocationDisplay';
import {fetchBandById, mergeBands} from '@/lib/api/bands';
import type {BandWithDiscographyResponse} from '@/types/api/bands';

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

export default function BandMergeComparison({
                                                open,
                                                onCancel,
                                                originalBandId,
                                                selectedBandIds: initialSelectedBandIds,
                                                onMergeComplete
                                            }: BandMergeComparisonProps) {
    const [allBands, setAllBands] = useState<BandComparisonItem[]>([]);
    const [remainingBandIds, setRemainingBandIds] = useState<number[]>(initialSelectedBandIds);
    const [selectedValues, setSelectedValues] = useState<Record<string, MergeFieldValue>>({});
    const [activeTab, setActiveTab] = useState<string>('basic');
    const [initialLoading, setInitialLoading] = useState(true);
    const [merging, setMerging] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Update remainingBandIds when initialSelectedBandIds changes
    useEffect(() => {
        if (open) {
            setRemainingBandIds(initialSelectedBandIds);
        }
    }, [initialSelectedBandIds, open]);

    // Load all band data
    useEffect(() => {
        if (!open) return;

        const loadBands = async () => {
            setInitialLoading(true);
            setError(null);

            // Initialize band data structure with original band and remaining selected bands
            const bandIds = [originalBandId, ...remainingBandIds];
            const initialBands = bandIds.map(id => ({
                id,
                name: `Band ${id}`,
                data: {} as BandWithDiscographyResponse,
                loading: true,
                error: null
            }));

            setAllBands(initialBands);

            // Load each band's data
            for (const id of bandIds) {
                try {
                    const bandData = await fetchBandById(id);

                    setAllBands(prev => prev.map(band =>
                        band.id === id
                            ? {...band, name: bandData.name, data: bandData, loading: false, error: null}
                            : band
                    ));

                } catch (err) {
                    console.error(`Error loading band ${id}:`, err);
                    setAllBands(prev => prev.map(band =>
                        band.id === id
                            ? {...band, loading: false, error: 'Failed to load band data'}
                            : band
                    ));
                }
            }

            setInitialLoading(false);
        };

        loadBands();
    }, [open, originalBandId, remainingBandIds]);

    // Initialize selected values with original band's data
    useEffect(() => {
        if (!open || initialLoading) return;

        const originalBand = allBands.find(band => band.id === originalBandId);
        if (!originalBand || !originalBand.data) return;

        const initialSelections: Record<string, MergeFieldValue> = {};

        // Initialize selections with the original band's values
        FIELD_GROUPS.forEach(group => {
            group.fields.forEach(field => {
                // Skip special fields like location_display
                if (field.special) return;

                // Skip hidden fields
                if (field.hidden) return;

                const key = field.key as keyof BandWithDiscographyResponse;
                const value = originalBand.data[key];
                if (value !== undefined) {
                    initialSelections[key] = {value, sourceId: originalBandId};
                }
            });
        });

        // Handle location (country_id, state_id, city_id) as a group
        if (originalBand.data.country_id || originalBand.data.state_id || originalBand.data.city_id) {
            initialSelections.country_id = {value: originalBand.data.country_id, sourceId: originalBandId};
            initialSelections.state_id = {value: originalBand.data.state_id, sourceId: originalBandId};
            initialSelections.city_id = {value: originalBand.data.city_id, sourceId: originalBandId};
        }

        setSelectedValues(initialSelections);
    }, [open, initialLoading, allBands, originalBandId]);

    const handleSelectValue = (fieldKey: string, value: any, sourceId: number) => {
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
    };

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

            // Call the merge API
            const result = await mergeBands({
                from_ids: remainingBandIds,
                into_id: originalBandId,
                merged_data: mergedData
            });

            // Notify parent component about successful merge
            onMergeComplete(result as BandWithDiscographyResponse);

        } catch (err) {
            console.error('Error merging bands:', err);
            setError('Failed to merge bands. Please try again later.');
        } finally {
            setMerging(false);
        }
    };

    // Remove a band from the merge
    const handleRemoveBand = (bandId: number) => {
        // Don't allow removing the original band
        if (bandId === originalBandId) return;

        // Update remaining band IDs
        setRemainingBandIds(prev => prev.filter(id => id !== bandId));

        // Remove the band from allBands
        setAllBands(prev => prev.filter(band => band.id !== bandId));

        // Update selected values
        // If a field's source was the removed band, revert to original band's value
        setSelectedValues(prev => {
            const updatedValues = {...prev};

            Object.entries(updatedValues).forEach(([key, value]) => {
                if (value.sourceId === bandId) {
                    // Find original band's value for this field
                    const originalBand = allBands.find(b => b.id === originalBandId);
                    if (originalBand) {
                        updatedValues[key] = {
                            value: originalBand.data[key as keyof BandWithDiscographyResponse],
                            sourceId: originalBandId
                        };
                    }
                }
            });

            return updatedValues;
        });
    };

    // Render function for special fields
    const renderSpecialField = (field: string, band: BandComparisonItem) => {
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
    };

    // Show band list with removal options
    const renderBandList = () => {
        return (
            <div className="mb-6 border rounded-md p-4 bg-blue-50">
                <div className="font-medium mb-2">Bands to be merged:</div>
                <div className="space-y-2">
                    {allBands.map(band => (
                        <div key={band.id} className="flex justify-between items-center p-2 bg-white rounded border">
                            <div className="flex-1">
                <span className={band.id === originalBandId ? 'text-blue-600 font-medium' : ''}>
                  {band.name}
                </span>
                                {band.id === originalBandId &&
                                    <span className="ml-2 text-xs text-blue-500">(Primary)</span>}
                                {band.loading && <Spin size="small" className="ml-2"/>}
                                {band.error && <span className="ml-2 text-xs text-red-500">Error loading</span>}
                            </div>
                            {band.id !== originalBandId && (
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

                {remainingBandIds.length === 0 && (
                    <Alert
                        className="mt-3"
                        type="warning"
                        title="You've removed all bands to merge. Add bands back or cancel the merge process."
                        showIcon
                    />
                )}
            </div>
        );
    };

    // Get the original band for the preview
    const originalBand = allBands.find(band => band.id === originalBandId) || null;

    const tabItems = [
        {
            key: 'basic',
            label: 'Basic Info',
            children: (
                <>
                    {renderBandList()}
                    <MergeFieldGroup
                        fieldGroup={FIELD_GROUPS.find(g => g.key === 'basic')!}
                        allBands={allBands}
                        originalBandId={originalBandId}
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
                    allBands={allBands}
                    originalBandId={originalBandId}
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
                        allBands={allBands}
                        originalBandId={originalBandId}
                        selectedValues={selectedValues}
                        onSelectValue={handleSelectValue}
                    />
                    <MergeFieldGroup
                        fieldGroup={FIELD_GROUPS.find(g => g.key === 'social')!}
                        allBands={allBands}
                        originalBandId={originalBandId}
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
                    allBands={allBands}
                    originalBandId={originalBandId}
                    selectedValues={selectedValues}
                    onSelectValue={handleSelectValue}
                />
            )
        },
        {
            key: 'images',
            label: 'Images',
            children: <ImageComparison allBands={allBands} originalBandId={originalBandId}/>
        },
        {
            key: 'discography',
            label: 'Discography',
            children: <DiscographyComparison allBands={allBands} originalBandId={originalBandId}/>
        },
        {
            key: 'preview',
            label: 'Merge Preview',
            children: (
                <MergePreview
                    originalBand={originalBand}
                    allBands={allBands}
                    selectedValues={selectedValues}
                    selectedBandIds={remainingBandIds}
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
                    disabled={initialLoading || remainingBandIds.length === 0 || Object.keys(selectedValues).length === 0}
                >
                    Merge Bands
                </Button>
            ]}
            width={800}
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

                    <MergeModalFooter/>
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
