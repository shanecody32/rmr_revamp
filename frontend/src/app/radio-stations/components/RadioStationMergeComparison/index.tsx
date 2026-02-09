'use client'

import {CloseCircleOutlined, SwapOutlined} from '@ant-design/icons';
import {Alert, Button, Modal, Radio, Spin, Tabs, Tooltip} from 'antd';
import {useCallback, useEffect, useState} from 'react';

import {mergeRadioStations, fetchRadioStationMergePreview} from '@/lib/api/radio-stations';
import {api} from '@/lib/api/config';
import type {RadioStationResponse, RadioStationMergePreviewResponse} from '@/types/api/radio-stations';
import type {RadioStationMergeResult} from '@/types/api/radio-stations';

import {FIELD_GROUPS} from './constants';
import MergeFieldGroup from './MergeFieldGroup';
import MergeModalFooter from './MergeModalFooter';
import MergeModalHeader from './MergeModalHeader';
import MergePreview from './MergePreview';
import type {RadioStationComparisonItem, MergeFieldValue} from './types';

interface RadioStationMergeComparisonProps {
    open: boolean;
    onCancel: () => void;
    originalStationId: number;
    selectedStationIds: number[];
    onMergeComplete: (mergedStation: RadioStationResponse) => void;
}

// Helper to check if a value is considered "has data"
const hasData = (value: any): boolean => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string' && value.trim() === '') return false;
    if (typeof value === 'boolean') return true; // booleans always have data
    return true;
};

export default function RadioStationMergeComparison({
                                                        open,
                                                        onCancel,
                                                        originalStationId,
                                                        selectedStationIds: initialSelectedStationIds,
                                                        onMergeComplete
                                                    }: RadioStationMergeComparisonProps) {
    const [allStations, setAllStations] = useState<RadioStationComparisonItem[]>([]);
    const [allStationIds, setAllStationIds] = useState<number[]>([]); // Track all station IDs for the merge
    const [primaryStationId, setPrimaryStationId] = useState<number>(originalStationId);
    const [selectedValues, setSelectedValues] = useState<Record<string, MergeFieldValue>>({});
    const [activeTab, setActiveTab] = useState<string>('basic');
    const [initialLoading, setInitialLoading] = useState(true);
    const [merging, setMerging] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [previewData, setPreviewData] = useState<RadioStationMergePreviewResponse | null>(null);

    // Reset state when modal opens
    useEffect(() => {
        if (open) {
            // All station IDs = original station + selected stations
            const allIds = [originalStationId, ...initialSelectedStationIds.filter(id => id !== originalStationId)];
            setAllStationIds(allIds);
            setPrimaryStationId(originalStationId);
            setAllStations([]);
            setSelectedValues({});
            setInitialLoading(true);
            setSmartDefaultsApplied(false);
        }
    }, [initialSelectedStationIds, originalStationId, open]);

    // Load all station data (only when allStationIds changes, not when primaryStationId changes)
    useEffect(() => {
        if (!open || allStationIds.length === 0) return;

        const loadStations = async () => {
            setInitialLoading(true);
            setError(null);

            // Initialize station data structure
            const initialStations = allStationIds.map(id => ({
                id,
                name: `Station ${id}`,
                data: {} as RadioStationResponse,
                loading: true,
                error: null
            }));

            setAllStations(initialStations);

            // Load all stations and preview data in parallel
            const [stationResults, previewResult] = await Promise.all([
                Promise.allSettled(
                    allStationIds.map(id => api.get<RadioStationResponse>(`/radio_stations/${id}`).then(res => res.data))
                ),
                fetchRadioStationMergePreview(allStationIds).catch(err => {
                    console.error('Error loading merge preview:', err);
                    return null;
                }),
            ]);

            const loadedStations = initialStations.map((station, index) => {
                const result = stationResults[index];
                if (result.status === 'fulfilled') {
                    return {...station, name: result.value.name, data: result.value, loading: false, error: null};
                } else {
                    console.error(`Error loading radio station ${station.id}:`, result.reason);
                    return {...station, loading: false, error: 'Failed to load radio station data'};
                }
            });

            setAllStations(loadedStations);
            setPreviewData(previewResult);
            setInitialLoading(false);
        };

        loadStations();
    }, [open, allStationIds]);

    // Smart defaults: find best source for a field
    // Priority: 1. Station with data (if only one has data), 2. Primary station (if multiple have data or none have)
    const findBestSourceForField = useCallback((fieldKey: string): { value: any; sourceId: number } | null => {
        const stationsWithData: { station: RadioStationComparisonItem; value: any }[] = [];
        const primaryStation = allStations.find(s => s.id === primaryStationId);

        for (const station of allStations) {
            if (station.loading || !station.data) continue;
            const value = station.data[fieldKey as keyof RadioStationResponse];
            if (hasData(value)) {
                stationsWithData.push({station, value});
            }
        }

        // If exactly one station has data, use that
        if (stationsWithData.length === 1) {
            return {value: stationsWithData[0].value, sourceId: stationsWithData[0].station.id};
        }

        // If multiple stations have data or none have data, use primary station
        if (primaryStation && !primaryStation.loading && primaryStation.data) {
            const value = primaryStation.data[fieldKey as keyof RadioStationResponse];
            return {value, sourceId: primaryStationId};
        }

        return null;
    }, [allStations, primaryStationId]);

    // Initialize selected values with smart defaults (only on initial load, not on primary change)
    const [smartDefaultsApplied, setSmartDefaultsApplied] = useState(false);

    useEffect(() => {
        if (!open || initialLoading || smartDefaultsApplied) return;

        const primaryStation = allStations.find(station => station.id === primaryStationId);
        if (!primaryStation || !primaryStation.data) return;

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
    }, [open, initialLoading, allStations, primaryStationId, findBestSourceForField, smartDefaultsApplied]);

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

            // Stations to merge from (all stations except the primary)
            const fromIds = allStations
                .map(s => s.id)
                .filter(id => id !== primaryStationId);

            // Call the merge API
            const result: RadioStationMergeResult = await mergeRadioStations({
                from_ids: fromIds,
                into_id: primaryStationId,
                merged_data: mergedData
            });

            // Log merge stats for debugging
            console.log('Radio station merge completed:', {
                stats: result.stats,
            });

            // Notify parent component about successful merge
            onMergeComplete(result.merged_station);

        } catch (err) {
            console.error('Error merging radio stations:', err);
            setError('Failed to merge radio stations. Please try again later.');
        } finally {
            setMerging(false);
        }
    };

    // Remove a station from the merge
    const handleRemoveStation = (stationId: number) => {
        // Don't allow removing if it's the only station left besides primary
        if (allStations.length <= 2) return;

        // If removing the primary station, set new primary to first remaining station
        let newPrimaryId = primaryStationId;
        if (stationId === primaryStationId) {
            const newPrimary = allStations.find(s => s.id !== stationId);
            if (newPrimary) {
                newPrimaryId = newPrimary.id;
                setPrimaryStationId(newPrimary.id);
            }
        }

        // Update all station IDs
        setAllStationIds(prev => prev.filter(id => id !== stationId));

        // Remove the station from allStations
        setAllStations(prev => prev.filter(station => station.id !== stationId));

        // Update selected values
        // If a field's source was the removed station, revert to primary station's value
        setSelectedValues(prev => {
            const updatedValues = {...prev};

            Object.entries(updatedValues).forEach(([key, value]) => {
                if (value.sourceId === stationId) {
                    // Find primary station's value for this field
                    const primaryStation = allStations.find(s => s.id === newPrimaryId);
                    if (primaryStation) {
                        updatedValues[key] = {
                            value: (primaryStation.data as any)[key],
                            sourceId: newPrimaryId
                        };
                    }
                }
            });

            return updatedValues;
        });
    };

    // Change the primary station (the one that will be kept after merge)
    // Only swap fields whose current source was the old primary -- preserve user selections from other sources
    const handleChangePrimary = (newPrimaryId: number) => {
        const oldPrimaryId = primaryStationId;
        setPrimaryStationId(newPrimaryId);

        if (oldPrimaryId === newPrimaryId) return;

        const newPrimaryStation = allStations.find(s => s.id === newPrimaryId);
        if (!newPrimaryStation || !newPrimaryStation.data) return;

        setSelectedValues(prev => {
            const updated = {...prev};
            Object.entries(updated).forEach(([key, fieldValue]) => {
                if (fieldValue.sourceId === oldPrimaryId) {
                    updated[key] = {
                        value: (newPrimaryStation.data as any)[key],
                        sourceId: newPrimaryId
                    };
                }
            });
            return updated;
        });
    };

    // Get the primary station for the preview
    const primaryStation = allStations.find(station => station.id === primaryStationId) || null;

    // Stations that will be merged into primary
    const mergingFromIds = allStations.map(s => s.id).filter(id => id !== primaryStationId);

    // Sort stations with primary first for display
    const sortedStations = [...allStations].sort((a, b) => {
        if (a.id === primaryStationId) return -1;
        if (b.id === primaryStationId) return 1;
        return 0;
    });

    // Show station list with primary selection and removal options
    const renderStationList = () => {
        return (
            <div className="mb-6 border rounded-md p-4 bg-blue-50">
                <div className="font-medium mb-2 flex items-center gap-2">
                    <span>Radio stations to be merged</span>
                    <Tooltip title="Select which radio station to keep as primary. The primary station's ID will be preserved, and other stations will be merged into it.">
                        <SwapOutlined className="text-blue-500 cursor-help" />
                    </Tooltip>
                </div>
                <div className="text-xs text-gray-500 mb-3">
                    Select the primary radio station to keep (all others will be merged into it)
                </div>
                <Radio.Group
                    value={primaryStationId}
                    onChange={(e) => handleChangePrimary(e.target.value)}
                    className="w-full"
                >
                    <div className="space-y-2">
                        {sortedStations.map(station => (
                            <div key={station.id} className={`flex justify-between items-center p-2 rounded border ${station.id === primaryStationId ? 'bg-blue-100 border-blue-300' : 'bg-white'}`}>
                                <Radio value={station.id} disabled={station.loading}>
                                    <span className={station.id === primaryStationId ? 'text-blue-600 font-medium' : ''}>
                                        {station.name}
                                    </span>
                                    {station.id === primaryStationId &&
                                        <span className="ml-2 text-xs text-blue-500 font-medium">(Primary - will be kept)</span>}
                                    {station.loading && <Spin size="small" className="ml-2"/>}
                                    {station.error && <span className="ml-2 text-xs text-red-500">Error loading</span>}
                                </Radio>
                                {allStations.length > 2 && (
                                    <Button
                                        type="text"
                                        danger
                                        icon={<CloseCircleOutlined/>}
                                        onClick={() => handleRemoveStation(station.id)}
                                        size="small"
                                    >
                                        Remove
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                </Radio.Group>

                {allStations.length < 2 && (
                    <Alert
                        className="mt-3"
                        type="warning"
                        message="You need at least 2 radio stations to perform a merge."
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
                    {renderStationList()}
                    <MergeFieldGroup
                        fieldGroup={FIELD_GROUPS.find(g => g.key === 'basic')!}
                        allStations={sortedStations}
                        primaryStationId={primaryStationId}
                        selectedValues={selectedValues}
                        onSelectValue={handleSelectValue}
                    />
                </>
            )
        },
        {
            key: 'status',
            label: 'Status',
            children: (
                <MergeFieldGroup
                    fieldGroup={FIELD_GROUPS.find(g => g.key === 'status')!}
                    allStations={sortedStations}
                    primaryStationId={primaryStationId}
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
                    originalStation={primaryStation}
                    allStations={sortedStations}
                    selectedValues={selectedValues}
                    selectedStationIds={mergingFromIds}
                    previewData={previewData}
                />
            )
        }
    ];

    return (
        <Modal
            title="Compare & Merge Radio Stations"
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
                    disabled={initialLoading || allStations.length < 2 || Object.keys(selectedValues).length === 0}
                >
                    Merge Radio Stations
                </Button>
            ]}
            width={1400}
            className="radio-station-merge-modal"
        >
            {initialLoading ? (
                <div className="text-center py-12">
                    <Spin size="large"/>
                    <div className="mt-4">Loading radio station data...</div>
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

                    <MergeModalFooter allStations={allStations} primaryStationId={primaryStationId}/>
                </>
            )}

            <style jsx global>{`
        .radio-station-merge-modal .merge-tabs .ant-tabs-nav {
          margin-bottom: 24px;
        }
        .radio-station-merge-modal .ant-card-body {
          padding: 12px;
        }
      `}</style>
        </Modal>
    );
}
