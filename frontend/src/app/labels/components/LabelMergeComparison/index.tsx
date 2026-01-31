'use client'

import {CloseCircleOutlined, SwapOutlined} from '@ant-design/icons';
import {Alert, Button, Modal, Radio, Spin, Tabs, Tooltip} from 'antd';
import {useCallback, useEffect, useState} from 'react';

import {api} from '@/lib/api/config';
import {mergeLabels} from '@/lib/api/labels';
import type {LabelResponse, LabelMergeResult} from '@/types/api/labels';

import {FIELD_GROUPS} from './constants';
import MergeFieldGroup from './MergeFieldGroup';
import MergeModalFooter from './MergeModalFooter';
import MergeModalHeader from './MergeModalHeader';
import MergePreview from './MergePreview';
import type {LabelComparisonItem, MergeFieldValue} from './types';

interface LabelMergeComparisonProps {
    open: boolean;
    onCancel: () => void;
    originalLabelId: number;
    selectedLabelIds: number[];
    onMergeComplete: (mergedLabel: LabelResponse) => void;
}

// Helper to check if a value is considered "has data"
const hasData = (value: any): boolean => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string' && value.trim() === '') return false;
    if (typeof value === 'boolean') return true; // booleans always have data
    return true;
};

export default function LabelMergeComparison({
                                                 open,
                                                 onCancel,
                                                 originalLabelId,
                                                 selectedLabelIds: initialSelectedLabelIds,
                                                 onMergeComplete
                                             }: LabelMergeComparisonProps) {
    const [allLabels, setAllLabels] = useState<LabelComparisonItem[]>([]);
    const [allLabelIds, setAllLabelIds] = useState<number[]>([]); // Track all label IDs for the merge
    const [primaryLabelId, setPrimaryLabelId] = useState<number>(originalLabelId);
    const [selectedValues, setSelectedValues] = useState<Record<string, MergeFieldValue>>({});
    const [activeTab, setActiveTab] = useState<string>('basic');
    const [initialLoading, setInitialLoading] = useState(true);
    const [merging, setMerging] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reset state when modal opens
    useEffect(() => {
        if (open) {
            // All label IDs = original label + selected labels
            const allIds = [originalLabelId, ...initialSelectedLabelIds.filter(id => id !== originalLabelId)];
            setAllLabelIds(allIds);
            setPrimaryLabelId(originalLabelId);
            setAllLabels([]);
            setSelectedValues({});
            setInitialLoading(true);
            setSmartDefaultsApplied(false);
        }
    }, [initialSelectedLabelIds, originalLabelId, open]);

    // Load all label data (only when allLabelIds changes, not when primaryLabelId changes)
    useEffect(() => {
        if (!open || allLabelIds.length === 0) return;

        const loadLabels = async () => {
            setInitialLoading(true);
            setError(null);

            // Initialize label data structure
            const initialLabels = allLabelIds.map(id => ({
                id,
                name: `Label ${id}`,
                data: {} as LabelResponse,
                loading: true,
                error: null
            }));

            setAllLabels(initialLabels);

            // Load all labels in parallel
            const results = await Promise.allSettled(
                allLabelIds.map(id => api.get<LabelResponse>(`/labels/${id}`).then(res => res.data))
            );

            const loadedLabels = initialLabels.map((label, index) => {
                const result = results[index];
                if (result.status === 'fulfilled') {
                    return {...label, name: result.value.name, data: result.value, loading: false, error: null};
                } else {
                    console.error(`Error loading label ${label.id}:`, result.reason);
                    return {...label, loading: false, error: 'Failed to load label data'};
                }
            });

            setAllLabels(loadedLabels);
            setInitialLoading(false);
        };

        loadLabels();
    }, [open, allLabelIds]);

    // Smart defaults: find best source for a field
    // Priority: 1. Label with data (if only one has data), 2. Primary label (if multiple have data or none have)
    const findBestSourceForField = useCallback((fieldKey: string): { value: any; sourceId: number } | null => {
        const labelsWithData: { label: LabelComparisonItem; value: any }[] = [];
        const primaryLabel = allLabels.find(l => l.id === primaryLabelId);

        for (const label of allLabels) {
            if (label.loading || !label.data) continue;
            const value = label.data[fieldKey as keyof LabelResponse];
            if (hasData(value)) {
                labelsWithData.push({label, value});
            }
        }

        // If exactly one label has data, use that
        if (labelsWithData.length === 1) {
            return {value: labelsWithData[0].value, sourceId: labelsWithData[0].label.id};
        }

        // If multiple labels have data or none have data, use primary label
        if (primaryLabel && !primaryLabel.loading && primaryLabel.data) {
            const value = primaryLabel.data[fieldKey as keyof LabelResponse];
            return {value, sourceId: primaryLabelId};
        }

        return null;
    }, [allLabels, primaryLabelId]);

    // Initialize selected values with smart defaults (only on initial load, not on primary change)
    const [smartDefaultsApplied, setSmartDefaultsApplied] = useState(false);

    useEffect(() => {
        if (!open || initialLoading || smartDefaultsApplied) return;

        const primaryLabel = allLabels.find(label => label.id === primaryLabelId);
        if (!primaryLabel || !primaryLabel.data) return;

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
    }, [open, initialLoading, allLabels, primaryLabelId, findBestSourceForField, smartDefaultsApplied]);

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

            // Labels to merge from (all labels except the primary)
            const fromIds = allLabels
                .map(l => l.id)
                .filter(id => id !== primaryLabelId);

            // Call the merge API
            const result: LabelMergeResult = await mergeLabels({
                from_ids: fromIds,
                into_id: primaryLabelId,
                merged_data: mergedData
            });

            // Log merge stats for debugging
            console.log('Merge completed:', {
                stats: result.stats,
            });

            // Notify parent component about successful merge
            onMergeComplete(result.merged_label);

        } catch (err) {
            console.error('Error merging labels:', err);
            setError('Failed to merge labels. Please try again later.');
        } finally {
            setMerging(false);
        }
    };

    // Remove a label from the merge
    const handleRemoveLabel = (labelId: number) => {
        // Don't allow removing if it's the only label left besides primary
        if (allLabels.length <= 2) return;

        // If removing the primary label, set new primary to first remaining label
        let newPrimaryId = primaryLabelId;
        if (labelId === primaryLabelId) {
            const newPrimary = allLabels.find(l => l.id !== labelId);
            if (newPrimary) {
                newPrimaryId = newPrimary.id;
                setPrimaryLabelId(newPrimary.id);
            }
        }

        // Update all label IDs
        setAllLabelIds(prev => prev.filter(id => id !== labelId));

        // Remove the label from allLabels
        setAllLabels(prev => prev.filter(label => label.id !== labelId));

        // Update selected values
        // If a field's source was the removed label, revert to primary label's value
        setSelectedValues(prev => {
            const updatedValues = {...prev};

            Object.entries(updatedValues).forEach(([key, value]) => {
                if (value.sourceId === labelId) {
                    // Find primary label's value for this field
                    const primaryLabel = allLabels.find(l => l.id === newPrimaryId);
                    if (primaryLabel) {
                        updatedValues[key] = {
                            value: primaryLabel.data[key as keyof LabelResponse],
                            sourceId: newPrimaryId
                        };
                    }
                }
            });

            return updatedValues;
        });
    };

    // Change the primary label (the one that will be kept after merge)
    // Only swap fields whose current source was the old primary — preserve user selections from other sources
    const handleChangePrimary = (newPrimaryId: number) => {
        const oldPrimaryId = primaryLabelId;
        setPrimaryLabelId(newPrimaryId);

        if (oldPrimaryId === newPrimaryId) return;

        const newPrimaryLabel = allLabels.find(l => l.id === newPrimaryId);
        if (!newPrimaryLabel || !newPrimaryLabel.data) return;

        setSelectedValues(prev => {
            const updated = {...prev};
            Object.entries(updated).forEach(([key, fieldValue]) => {
                if (fieldValue.sourceId === oldPrimaryId) {
                    updated[key] = {
                        value: newPrimaryLabel.data[key as keyof LabelResponse],
                        sourceId: newPrimaryId
                    };
                }
            });
            return updated;
        });
    };

    // Get the primary label for the preview
    const primaryLabel = allLabels.find(label => label.id === primaryLabelId) || null;

    // Labels that will be merged into primary
    const mergingFromIds = allLabels.map(l => l.id).filter(id => id !== primaryLabelId);

    // Sort labels with primary first for display
    const sortedLabels = [...allLabels].sort((a, b) => {
        if (a.id === primaryLabelId) return -1;
        if (b.id === primaryLabelId) return 1;
        return 0;
    });

    // Show label list with primary selection and removal options
    const renderLabelList = () => {
        return (
            <div className="mb-6 border rounded-md p-4 bg-blue-50">
                <div className="font-medium mb-2 flex items-center gap-2">
                    <span>Labels to be merged</span>
                    <Tooltip title="Select which label to keep as primary. The primary label's ID will be preserved, and other labels will be merged into it.">
                        <SwapOutlined className="text-blue-500 cursor-help" />
                    </Tooltip>
                </div>
                <div className="text-xs text-gray-500 mb-3">
                    Select the primary label to keep (all others will be merged into it)
                </div>
                <Radio.Group
                    value={primaryLabelId}
                    onChange={(e) => handleChangePrimary(e.target.value)}
                    className="w-full"
                >
                    <div className="space-y-2">
                        {sortedLabels.map(label => (
                            <div key={label.id} className={`flex justify-between items-center p-2 rounded border ${label.id === primaryLabelId ? 'bg-blue-100 border-blue-300' : 'bg-white'}`}>
                                <Radio value={label.id} disabled={label.loading}>
                                    <span className={label.id === primaryLabelId ? 'text-blue-600 font-medium' : ''}>
                                        {label.name}
                                    </span>
                                    {label.id === primaryLabelId &&
                                        <span className="ml-2 text-xs text-blue-500 font-medium">(Primary - will be kept)</span>}
                                    {label.loading && <Spin size="small" className="ml-2"/>}
                                    {label.error && <span className="ml-2 text-xs text-red-500">Error loading</span>}
                                </Radio>
                                {allLabels.length > 2 && (
                                    <Button
                                        type="text"
                                        danger
                                        icon={<CloseCircleOutlined/>}
                                        onClick={() => handleRemoveLabel(label.id)}
                                        size="small"
                                    >
                                        Remove
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                </Radio.Group>

                {allLabels.length < 2 && (
                    <Alert
                        className="mt-3"
                        type="warning"
                        message="You need at least 2 labels to perform a merge."
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
                    {renderLabelList()}
                    <MergeFieldGroup
                        fieldGroup={FIELD_GROUPS.find(g => g.key === 'basic')!}
                        allLabels={sortedLabels}
                        primaryLabelId={primaryLabelId}
                        selectedValues={selectedValues}
                        onSelectValue={handleSelectValue}
                    />
                </>
            )
        },
        {
            key: 'preview',
            label: 'Merge Preview',
            children: (
                <MergePreview
                    originalLabel={primaryLabel}
                    allLabels={sortedLabels}
                    selectedValues={selectedValues}
                    selectedLabelIds={mergingFromIds}
                />
            )
        }
    ];

    return (
        <Modal
            title="Compare & Merge Labels"
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
                    disabled={initialLoading || allLabels.length < 2 || Object.keys(selectedValues).length === 0}
                >
                    Merge Labels
                </Button>
            ]}
            width={1400}
            className="label-merge-modal"
        >
            {initialLoading ? (
                <div className="text-center py-12">
                    <Spin size="large"/>
                    <div className="mt-4">Loading label data...</div>
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

                    <MergeModalFooter allLabels={allLabels} primaryLabelId={primaryLabelId}/>
                </>
            )}

            <style jsx global>{`
        .label-merge-modal .merge-tabs .ant-tabs-nav {
          margin-bottom: 24px;
        }
        .label-merge-modal .ant-card-body {
          padding: 12px;
        }
      `}</style>
        </Modal>
    );
}
