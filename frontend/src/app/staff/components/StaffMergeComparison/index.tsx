'use client'

import {CloseCircleOutlined, SwapOutlined} from '@ant-design/icons';
import {Alert, Button, Modal, Radio, Spin, Tabs, Tooltip, Typography} from 'antd';
import {useCallback, useEffect, useState} from 'react';

import {fetchStaffById, fetchStaffMergePreview, mergeStaff} from '@/lib/api/staff';
import type {StaffDetailView, StaffMergePreviewResponse, StaffResponse} from '@/types/api/staff';
import {getStaffDisplayName} from '@/types/api/staff';

import {STAFF_FIELD_GROUPS} from './constants';
import StaffImageComparison from './StaffImageComparison';
import StaffMergeFieldGroup from './StaffMergeFieldGroup';
import StaffMergePreview from './StaffMergePreview';
import type {MergeFieldValue, StaffComparisonItem} from './types';

const {Text} = Typography;

interface StaffMergeComparisonProps {
    open: boolean;
    onCancel: () => void;
    originalStaffId: number;
    selectedStaffIds: number[];
    onMergeComplete: (mergedStaff: StaffResponse) => void;
}

const hasData = (value: any): boolean => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string' && value.trim() === '') return false;
    if (typeof value === 'boolean') return true;
    return true;
};

export default function StaffMergeComparison({
                                                 open,
                                                 onCancel,
                                                 originalStaffId,
                                                 selectedStaffIds: initialSelectedStaffIds,
                                                 onMergeComplete
                                             }: StaffMergeComparisonProps) {
    const [allStaff, setAllStaff] = useState<StaffComparisonItem[]>([]);
    const [allStaffIds, setAllStaffIds] = useState<number[]>([]);
    const [primaryStaffId, setPrimaryStaffId] = useState<number>(originalStaffId);
    const [selectedValues, setSelectedValues] = useState<Record<string, MergeFieldValue>>({});
    const [activeTab, setActiveTab] = useState<string>('basic');
    const [initialLoading, setInitialLoading] = useState(true);
    const [merging, setMerging] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [smartDefaultsApplied, setSmartDefaultsApplied] = useState(false);
    const [previewData, setPreviewData] = useState<StaffMergePreviewResponse | null>(null);

    // Reset state when modal opens
    useEffect(() => {
        if (open) {
            const allIds = [originalStaffId, ...initialSelectedStaffIds.filter(id => id !== originalStaffId)];
            setAllStaffIds(allIds);
            setPrimaryStaffId(originalStaffId);
            setAllStaff([]);
            setSelectedValues({});
            setInitialLoading(true);
            setSmartDefaultsApplied(false);
        }
    }, [initialSelectedStaffIds, originalStaffId, open]);

    // Load all staff data
    useEffect(() => {
        if (!open || allStaffIds.length === 0) return;

        const loadStaff = async () => {
            setInitialLoading(true);
            setError(null);

            const initialStaff = allStaffIds.map(id => ({
                id,
                name: `Staff ${id}`,
                data: {} as StaffDetailView,
                loading: true,
                error: null
            }));

            setAllStaff(initialStaff);

            const [staffResults, previewResult] = await Promise.all([
                Promise.allSettled(
                    allStaffIds.map(id => fetchStaffById(id, {
                        include_images: true,
                        include_links: true,
                        include_phones: true,
                        include_addresses: true,
                        include_sub_genres: true,
                    }))
                ),
                fetchStaffMergePreview(allStaffIds).catch(err => {
                    console.error('Error loading merge preview:', err);
                    return null;
                }),
            ]);

            const loadedStaff = initialStaff.map((staff, index) => {
                const result = staffResults[index];
                if (result.status === 'fulfilled') {
                    return {
                        ...staff,
                        name: getStaffDisplayName(result.value),
                        data: result.value,
                        loading: false,
                        error: null,
                    };
                } else {
                    console.error(`Error loading staff ${staff.id}:`, result.reason);
                    return {...staff, loading: false, error: 'Failed to load staff data'};
                }
            });

            setAllStaff(loadedStaff);
            setPreviewData(previewResult);
            setInitialLoading(false);
        };

        loadStaff();
    }, [open, allStaffIds]);

    // Smart defaults
    const findBestSourceForField = useCallback((fieldKey: string): { value: any; sourceId: number } | null => {
        const staffWithData: { staff: StaffComparisonItem; value: any }[] = [];
        const primaryStaff = allStaff.find(s => s.id === primaryStaffId);

        for (const staff of allStaff) {
            if (staff.loading || !staff.data) continue;
            const value = staff.data[fieldKey as keyof StaffDetailView];
            if (hasData(value)) {
                staffWithData.push({staff, value});
            }
        }

        if (staffWithData.length === 1) {
            return {value: staffWithData[0].value, sourceId: staffWithData[0].staff.id};
        }

        if (primaryStaff && !primaryStaff.loading && primaryStaff.data) {
            const value = primaryStaff.data[fieldKey as keyof StaffDetailView];
            return {value, sourceId: primaryStaffId};
        }

        return null;
    }, [allStaff, primaryStaffId]);

    // Initialize smart defaults
    useEffect(() => {
        if (!open || initialLoading || smartDefaultsApplied) return;

        const primaryStaff = allStaff.find(s => s.id === primaryStaffId);
        if (!primaryStaff || !primaryStaff.data) return;

        const initialSelections: Record<string, MergeFieldValue> = {};

        STAFF_FIELD_GROUPS.forEach(group => {
            group.fields.forEach(field => {
                const best = findBestSourceForField(field.key);
                if (best) {
                    initialSelections[field.key] = best;
                }
            });
        });

        setSelectedValues(initialSelections);
        setSmartDefaultsApplied(true);
    }, [open, initialLoading, allStaff, primaryStaffId, findBestSourceForField, smartDefaultsApplied]);

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

            const mergedData: Partial<StaffResponse> = {};
            Object.entries(selectedValues).forEach(([key, data]) => {
                (mergedData as any)[key] = data.value;
            });

            const fromIds = allStaff
                .map(s => s.id)
                .filter(id => id !== primaryStaffId);

            const result = await mergeStaff({
                from_ids: fromIds,
                into_id: primaryStaffId,
                merged_data: mergedData,
            });

            console.log('Staff merge completed:', {stats: result.stats});
            onMergeComplete(result.merged_staff);
        } catch (err) {
            console.error('Error merging staff:', err);
            setError('Failed to merge staff members. Please try again later.');
        } finally {
            setMerging(false);
        }
    };

    const handleRemoveStaff = (staffId: number) => {
        if (allStaff.length <= 2) return;

        let newPrimaryId = primaryStaffId;
        if (staffId === primaryStaffId) {
            const newPrimary = allStaff.find(s => s.id !== staffId);
            if (newPrimary) {
                newPrimaryId = newPrimary.id;
                setPrimaryStaffId(newPrimary.id);
            }
        }

        setAllStaffIds(prev => prev.filter(id => id !== staffId));
        setAllStaff(prev => prev.filter(s => s.id !== staffId));

        setSelectedValues(prev => {
            const updated = {...prev};
            Object.entries(updated).forEach(([key, value]) => {
                if (value.sourceId === staffId) {
                    const primary = allStaff.find(s => s.id === newPrimaryId);
                    if (primary) {
                        updated[key] = {
                            value: primary.data[key as keyof StaffDetailView],
                            sourceId: newPrimaryId,
                        };
                    }
                }
            });
            return updated;
        });
    };

    const handleChangePrimary = (newPrimaryId: number) => {
        const oldPrimaryId = primaryStaffId;
        setPrimaryStaffId(newPrimaryId);

        if (oldPrimaryId === newPrimaryId) return;

        const newPrimaryStaff = allStaff.find(s => s.id === newPrimaryId);
        if (!newPrimaryStaff || !newPrimaryStaff.data) return;

        setSelectedValues(prev => {
            const updated = {...prev};
            Object.entries(updated).forEach(([key, fieldValue]) => {
                if (fieldValue.sourceId === oldPrimaryId) {
                    updated[key] = {
                        value: newPrimaryStaff.data[key as keyof StaffDetailView],
                        sourceId: newPrimaryId,
                    };
                }
            });
            return updated;
        });
    };

    const primaryStaff = allStaff.find(s => s.id === primaryStaffId) || null;
    const mergingFromIds = allStaff.map(s => s.id).filter(id => id !== primaryStaffId);

    const sortedStaff = [...allStaff].sort((a, b) => {
        if (a.id === primaryStaffId) return -1;
        if (b.id === primaryStaffId) return 1;
        return 0;
    });

    const renderStaffList = () => {
        return (
            <div className="mb-6 border rounded-md p-4 bg-blue-50">
                <div className="font-medium mb-2 flex items-center gap-2">
                    <span>Staff members to be merged</span>
                    <Tooltip
                        title="Select which staff member to keep as primary. The primary staff member's ID will be preserved, and others will be merged into it.">
                        <SwapOutlined className="text-blue-500 cursor-help"/>
                    </Tooltip>
                </div>
                <div className="text-xs text-gray-500 mb-3">
                    Select the primary staff member to keep (all others will be merged into it)
                </div>
                <Radio.Group
                    value={primaryStaffId}
                    onChange={(e) => handleChangePrimary(e.target.value)}
                    className="w-full"
                >
                    <div className="space-y-2">
                        {sortedStaff.map(staff => (
                            <div key={staff.id}
                                 className={`flex justify-between items-center p-2 rounded border ${staff.id === primaryStaffId ? 'bg-blue-100 border-blue-300' : 'bg-white'}`}>
                                <Radio value={staff.id} disabled={staff.loading}>
                                    <span
                                        className={staff.id === primaryStaffId ? 'text-blue-600 font-medium' : ''}>
                                        {staff.name}
                                    </span>
                                    {staff.id === primaryStaffId &&
                                        <span
                                            className="ml-2 text-xs text-blue-500 font-medium">(Primary - will be kept)</span>}
                                    {staff.loading && <Spin size="small" className="ml-2"/>}
                                    {staff.error &&
                                        <span className="ml-2 text-xs text-red-500">Error loading</span>}
                                </Radio>
                                {allStaff.length > 2 && (
                                    <Button
                                        type="text"
                                        danger
                                        icon={<CloseCircleOutlined/>}
                                        onClick={() => handleRemoveStaff(staff.id)}
                                        size="small"
                                    >
                                        Remove
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                </Radio.Group>

                {allStaff.length < 2 && (
                    <Alert
                        className="mt-3"
                        type="warning"
                        message="You need at least 2 staff members to perform a merge."
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
                    {renderStaffList()}
                    <StaffMergeFieldGroup
                        fieldGroup={STAFF_FIELD_GROUPS.find(g => g.key === 'basic')!}
                        allStaff={sortedStaff}
                        primaryStaffId={primaryStaffId}
                        selectedValues={selectedValues}
                        onSelectValue={handleSelectValue}
                    />
                </>
            ),
        },
        {
            key: 'contact',
            label: 'Contact & Show',
            children: (
                <StaffMergeFieldGroup
                    fieldGroup={STAFF_FIELD_GROUPS.find(g => g.key === 'contact')!}
                    allStaff={sortedStaff}
                    primaryStaffId={primaryStaffId}
                    selectedValues={selectedValues}
                    onSelectValue={handleSelectValue}
                />
            ),
        },
        {
            key: 'images',
            label: 'Images',
            children: <StaffImageComparison allStaff={sortedStaff} primaryStaffId={primaryStaffId}/>,
        },
        {
            key: 'preview',
            label: 'Merge Preview',
            children: (
                <StaffMergePreview
                    originalStaff={primaryStaff}
                    allStaff={sortedStaff}
                    selectedValues={selectedValues}
                    selectedStaffIds={mergingFromIds}
                    previewData={previewData}
                />
            ),
        },
    ];

    return (
        <Modal
            title="Compare & Merge Staff Members"
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
                    disabled={initialLoading || allStaff.length < 2 || Object.keys(selectedValues).length === 0}
                >
                    Merge Staff Members
                </Button>,
            ]}
            width={1400}
            className="staff-merge-modal"
        >
            {initialLoading ? (
                <div className="text-center py-12">
                    <Spin size="large"/>
                    <div className="mt-4">Loading staff data...</div>
                </div>
            ) : (
                <>
                    <Alert
                        description={
                            <div>
                                <p>Select which data to keep for each field from the available staff members.</p>
                                <p>The <Text className="text-blue-600 font-medium">primary staff member</Text> will be
                                    kept, and others will be merged into it.</p>
                            </div>
                        }
                        type="info"
                        showIcon
                        className="mb-6"
                    />

                    {error && (
                        <Alert
                            description={error}
                            type="error"
                            showIcon
                            className="mb-6"
                        />
                    )}

                    <Tabs
                        activeKey={activeTab}
                        onChange={setActiveTab}
                        className="merge-tabs"
                        items={tabItems}
                    />

                    <Alert
                        message="Warning"
                        description="Merging staff members will delete the selected duplicate profiles and keep only the primary staff member with the merged data. This action cannot be undone."
                        type="warning"
                        showIcon
                        className="mt-6"
                    />
                </>
            )}

            <style jsx global>{`
                .staff-merge-modal .merge-tabs .ant-tabs-nav {
                    margin-bottom: 24px;
                }

                .staff-merge-modal .ant-card-body {
                    padding: 12px;
                }

                .staff-merge-modal .image-card {
                    transition: all 0.3s ease;
                }

                .staff-merge-modal .image-card:hover {
                    transform: scale(1.02);
                }
            `}</style>
        </Modal>
    );
}
