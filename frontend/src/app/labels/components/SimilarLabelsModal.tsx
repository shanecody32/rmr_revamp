'use client'

import {Button, Checkbox, Collapse, Divider, InputNumber, message, Modal, Select, Slider, Space, Tag, Typography} from 'antd';
import {PlusOutlined, SearchOutlined, SettingOutlined} from '@ant-design/icons';
import {useEffect, useState, useRef} from 'react';

import {fetchLabels, type SimilarLabel} from '@/lib/api/labels';

const {Text} = Typography;

export interface SearchSettings {
    jw_weight: number;
    dice_weight: number;
    min_similarity: number;
    limit: number;
}

interface SimilarLabelsModalProps {
    open: boolean;
    onCancel: () => void;
    onSelect: (label: SimilarLabel) => void;
    onProceed: () => void;
    onMergeSelected?: (selectedLabels: SimilarLabel[]) => void;
    onRerunSearch?: (settings: SearchSettings) => void;
    similarLabels: SimilarLabel[];
    newLabelName: string;
    loading?: boolean;
    mode?: 'select-one' | 'select-multiple';
    searchSettings?: Partial<SearchSettings>;
    /** ID of the label being verified (to exclude from manual add) */
    excludeLabelId?: number;
    /** IDs of labels to pre-select (e.g., detected duplicates) */
    preSelectedIds?: number[];
}

const SETTINGS_STORAGE_KEY = 'label-similarity-search-settings';

const defaultSettings: SearchSettings = {
    jw_weight: 0.6,
    dice_weight: 0.4,
    min_similarity: 70,
    limit: 20,
};

// Load settings from localStorage
const loadSavedSettings = (): SearchSettings => {
    if (typeof window === 'undefined') return defaultSettings;
    try {
        const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (saved) {
            return { ...defaultSettings, ...JSON.parse(saved) };
        }
    } catch (e) {
        console.error('Error loading saved settings:', e);
    }
    return defaultSettings;
};

// Save settings to localStorage
const saveSettings = (settings: SearchSettings) => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
        console.error('Error saving settings:', e);
    }
};

// Empty array constant to avoid creating new reference on each render
const EMPTY_ARRAY: number[] = [];

export default function SimilarLabelsModal({
    open,
    onCancel,
    onSelect,
    onProceed,
    onMergeSelected,
    onRerunSearch,
    similarLabels,
    newLabelName,
    loading = false,
    mode = 'select-one',
    searchSettings,
    excludeLabelId,
    preSelectedIds,
}: SimilarLabelsModalProps) {
    // Use stable empty array reference if preSelectedIds is undefined
    const stablePreSelectedIds = preSelectedIds ?? EMPTY_ARRAY;
    const [selectedLabels, setSelectedLabels] = useState<SimilarLabel[]>([]);
    const [manuallyAddedLabels, setManuallyAddedLabels] = useState<SimilarLabel[]>([]);
    const [labelSearchOptions, setLabelSearchOptions] = useState<{value: number; label: string; item: SimilarLabel}[]>([]);
    const [labelSearchLoading, setLabelSearchLoading] = useState(false);
    const [localSettings, setLocalSettings] = useState<SearchSettings>(() => ({
        ...loadSavedSettings(),
        ...searchSettings,
    }));

    // Reset selections when modal opens/closes or similarLabels change
    useEffect(() => {
        if (open && similarLabels) {
            if (stablePreSelectedIds.length > 0) {
                const preSelected = similarLabels.filter(l => stablePreSelectedIds.includes(l.id));
                setSelectedLabels(preSelected);
            } else {
                setSelectedLabels([]);
            }
            setManuallyAddedLabels([]);
            setLabelSearchOptions([]);
        }
    }, [open, similarLabels, stablePreSelectedIds]);

    // Sync local settings with props
    useEffect(() => {
        if (searchSettings) {
            setLocalSettings(prev => ({...prev, ...searchSettings}));
        }
    }, [searchSettings]);

    // Debounced label search for manual add
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleLabelSearch = (searchValue: string) => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        if (!searchValue || searchValue.length < 2) {
            setLabelSearchOptions([]);
            return;
        }

        searchTimeoutRef.current = setTimeout(async () => {
            setLabelSearchLoading(true);
            try {
                const result = await fetchLabels({
                    name: searchValue,
                    name_filter_type: 'contains',
                    page: 1,
                    page_size: 20,
                });

                // Filter out labels that are already in the list or excluded
                const existingIds = new Set([
                    ...similarLabels.map(l => l.id),
                    ...manuallyAddedLabels.map(l => l.id),
                    ...(excludeLabelId ? [excludeLabelId] : []),
                ]);

                const options = result.data
                    .filter(label => !existingIds.has(label.id))
                    .map(label => ({
                        value: label.id,
                        label: label.name,
                        item: {
                            id: label.id,
                            name: label.name,
                            similarity_score: 0, // Manual add = 0 score (shown as "Manual")
                        } as SimilarLabel,
                    }));

                setLabelSearchOptions(options);
            } catch (error) {
                console.error('Error searching labels:', error);
            } finally {
                setLabelSearchLoading(false);
            }
        }, 300);
    };

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, []);

    const handleAddManualLabel = (labelId: number) => {
        const option = labelSearchOptions.find(o => o.value === labelId);
        if (option) {
            setManuallyAddedLabels(prev => [...prev, option.item]);
            setLabelSearchOptions([]);
        }
    };

    const handleToggleLabel = (label: SimilarLabel) => {
        if (selectedLabels.some(l => l.id === label.id)) {
            setSelectedLabels(selectedLabels.filter(l => l.id !== label.id));
        } else {
            setSelectedLabels([...selectedLabels, label]);
        }
    };

    const handleCancel = () => {
        setSelectedLabels([]);
        setManuallyAddedLabels([]);
        onCancel();
    };

    const handleMergeSelected = () => {
        if (selectedLabels.length === 0) {
            message.warning('Please select at least one label to merge');
            return;
        }

        if (onMergeSelected) {
            onMergeSelected(selectedLabels);
        }
    };

    const handleRerunSearch = () => {
        saveSettings(localSettings);
        if (onRerunSearch) {
            onRerunSearch(localSettings);
        }
    };

    // Combine similar labels with manually added labels
    const allLabels = [...similarLabels, ...manuallyAddedLabels];

    // Calculate column count based on number of labels
    const getColumnCount = () => {
        if (allLabels.length <= 3) return 2;
        if (allLabels.length <= 8) return 3;
        return 4;
    };

    const columnCount = getColumnCount();

    // Create footer buttons based on mode
    const footerButtons = [];

    footerButtons.push(
        <Button key="cancel" onClick={handleCancel} disabled={loading}>
            Cancel
        </Button>
    );

    if (mode === 'select-multiple') {
        footerButtons.push(
            <Button
                key="skipMerge"
                onClick={onProceed}
                disabled={loading}
            >
                Skip Merge and Edit
            </Button>
        );

        footerButtons.push(
            <Button
                key="merge"
                type="primary"
                onClick={handleMergeSelected}
                disabled={selectedLabels.length === 0 || loading}
                loading={loading}
            >
                Compare & Merge ({selectedLabels.length})
            </Button>
        );
    } else {
        footerButtons.push(
            <Button
                key="proceed"
                type="primary"
                onClick={onProceed}
                loading={loading}
            >
                Create New Label
            </Button>
        );
    }

    return (
        <Modal
            title={mode === 'select-one' ? "Similar Labels Found" : "Select Labels to Merge"}
            open={open}
            onCancel={handleCancel}
            footer={footerButtons}
            width={1200}
        >
            {/* Source Label Display */}
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                        <Tag color="blue" className="text-base px-3 py-1">Source Label</Tag>
                    </div>
                    <div className="flex-1">
                        <Text strong className="text-lg">{newLabelName}</Text>
                    </div>
                </div>
                <Text type="secondary" className="block mt-2 text-sm">
                    {mode === 'select-one'
                        ? `Check if this label already exists (${allLabels.length} similar found${manuallyAddedLabels.length > 0 ? `, ${manuallyAddedLabels.length} manually added` : ''})`
                        : `Select labels below that are duplicates of this label to merge (${allLabels.length} found${manuallyAddedLabels.length > 0 ? `, ${manuallyAddedLabels.length} manually added` : ''})`
                    }
                </Text>
            </div>

            {/* Manual Label Add */}
            <div className="mb-4 flex items-center gap-2">
                <SearchOutlined className="text-gray-400" />
                <Select
                    showSearch
                    placeholder="Search and add a label manually..."
                    style={{ flex: 1, maxWidth: 400 }}
                    filterOption={false}
                    onSearch={handleLabelSearch}
                    onChange={handleAddManualLabel}
                    loading={labelSearchLoading}
                    options={labelSearchOptions}
                    value={null}
                    notFoundContent={labelSearchLoading ? 'Searching...' : 'Type to search labels'}
                />
                <Text type="secondary" className="text-sm">
                    Add labels not found by similarity search
                </Text>
            </div>

            <Divider className="my-3" />

            {/* Search Settings Panel */}
            <Collapse
                ghost
                className="mb-4 bg-gray-50 rounded-lg"
                items={[
                    {
                        key: 'settings',
                        label: (
                            <Space>
                                <SettingOutlined />
                                <span>Search Settings</span>
                            </Space>
                        ),
                        children: (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-2">
                                <div>
                                    <Text className="block mb-2 font-medium">Minimum Similarity: {localSettings.min_similarity}%</Text>
                                    <Slider
                                        min={10}
                                        max={100}
                                        step={5}
                                        value={localSettings.min_similarity}
                                        onChange={(value) => setLocalSettings(prev => ({...prev, min_similarity: value}))}
                                        marks={{10: '10%', 40: '40%', 70: '70%', 100: '100%'}}
                                    />
                                    <Text type="secondary" className="text-xs">
                                        Lower = more results, Higher = stricter matching
                                    </Text>
                                </div>

                                <div>
                                    <Text className="block mb-2 font-medium">Jaro-Winkler Weight</Text>
                                    <InputNumber
                                        min={0}
                                        max={1}
                                        step={0.1}
                                        value={localSettings.jw_weight}
                                        onChange={(value) => setLocalSettings(prev => ({...prev, jw_weight: value ?? 0.6}))}
                                        style={{width: '100%'}}
                                    />
                                    <Text type="secondary" className="text-xs">
                                        Weight for character-level similarity (0-1)
                                    </Text>
                                </div>

                                <div>
                                    <Text className="block mb-2 font-medium">Dice Coefficient Weight</Text>
                                    <InputNumber
                                        min={0}
                                        max={1}
                                        step={0.1}
                                        value={localSettings.dice_weight}
                                        onChange={(value) => setLocalSettings(prev => ({...prev, dice_weight: value ?? 0.4}))}
                                        style={{width: '100%'}}
                                    />
                                    <Text type="secondary" className="text-xs">
                                        Weight for bigram similarity (0-1)
                                    </Text>
                                </div>

                                <div>
                                    <Text className="block mb-2 font-medium">Max Results</Text>
                                    <Select
                                        value={localSettings.limit}
                                        onChange={(value) => setLocalSettings(prev => ({...prev, limit: value}))}
                                        style={{width: '100%'}}
                                        options={[
                                            {value: 10, label: '10'},
                                            {value: 20, label: '20'},
                                            {value: 30, label: '30'},
                                            {value: 50, label: '50'},
                                            {value: 100, label: '100'},
                                        ]}
                                    />
                                </div>

                                <div className="flex items-end">
                                    <Button
                                        type="primary"
                                        onClick={handleRerunSearch}
                                        loading={loading}
                                        disabled={loading}
                                        block
                                    >
                                        Rerun Search
                                    </Button>
                                </div>
                            </div>
                        ),
                    },
                ]}
            />

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
                    gap: '12px',
                    maxHeight: '50vh',
                    overflowY: 'auto',
                    padding: '4px',
                }}
            >
                {allLabels.map((label) => {
                    const isSelected = selectedLabels.some(l => l.id === label.id);
                    const isManuallyAdded = manuallyAddedLabels.some(l => l.id === label.id);

                    return (
                        <div
                            key={label.id}
                            className={`p-4 border rounded-lg cursor-pointer transition-all ${
                                isSelected
                                    ? 'border-blue-500 bg-blue-50 shadow-md'
                                    : isManuallyAdded
                                    ? 'border-purple-300 bg-purple-50 hover:border-purple-400'
                                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                            }`}
                            onClick={() => mode === 'select-multiple' && handleToggleLabel(label)}
                        >
                            <div className="flex items-start gap-3">
                                {mode === 'select-multiple' && (
                                    <Checkbox
                                        checked={isSelected}
                                        onChange={() => handleToggleLabel(label)}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                )}
                                <div className="flex-1 min-w-0">
                                    <Text strong className="block truncate" title={label.name}>
                                        {label.name}
                                    </Text>
                                    <Space size="small" wrap className="mt-2">
                                        {isManuallyAdded ? (
                                            <Tag color="purple">
                                                <PlusOutlined /> Manual
                                            </Tag>
                                        ) : (
                                            <Tag color="blue">
                                                {label.similarity_score}% match
                                            </Tag>
                                        )}
                                    </Space>

                                    {mode === 'select-one' && (
                                        <Button
                                            type="primary"
                                            size="small"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onSelect(label);
                                            }}
                                            loading={loading}
                                            disabled={loading}
                                            className="mt-3"
                                            block
                                        >
                                            Select This Label
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </Modal>
    );
}
