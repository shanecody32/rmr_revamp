'use client'

import {Button, Checkbox, Collapse, Divider, InputNumber, message, Modal, Select, Slider, Space, Switch, Tag, Typography} from 'antd';
import {PlusOutlined, SearchOutlined, SettingOutlined} from '@ant-design/icons';
import {useEffect, useState, useRef} from 'react';

import {StatusTag} from '@/lib/utils/status';
import type {SimilarBand} from '@/lib/api/bands';
import {fetchBands} from '@/lib/api/bands';

const {Text} = Typography;

export interface SearchSettings {
    jw_weight: number;
    dice_weight: number;
    min_similarity: number;
    restrict_to_parent: boolean;
    limit: number;
}

interface SimilarBandsModalProps {
    open: boolean;
    onCancel: () => void;
    onSelect: (band: SimilarBand) => void;
    onProceed: () => void;
    onMergeSelected?: (selectedBands: SimilarBand[]) => void;
    onRerunSearch?: (settings: SearchSettings) => void;
    similarBands: SimilarBand[];
    newBandName: string;
    loading?: boolean;
    mode?: 'select-one' | 'select-multiple';
    maxSelections?: number;
    searchSettings?: Partial<SearchSettings>;
    /** ID of the band being verified (to exclude from manual add) */
    excludeBandId?: number;
    /** IDs of bands to pre-select (e.g., detected duplicates) */
    preSelectedIds?: number[];
}

const SETTINGS_STORAGE_KEY = 'similarity-search-settings';

const defaultSettings: SearchSettings = {
    jw_weight: 0.6,
    dice_weight: 0.4,
    min_similarity: 70,
    restrict_to_parent: false,
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

export default function SimilarBandsModal({
                                              open,
                                              onCancel,
                                              onSelect,
                                              onProceed,
                                              onMergeSelected,
                                              onRerunSearch,
                                              similarBands,
                                              newBandName,
                                              loading = false,
                                              mode = 'select-one',
                                              maxSelections = Infinity,
                                              searchSettings,
                                              excludeBandId,
                                              preSelectedIds,
                                          }: SimilarBandsModalProps) {
    // Use stable empty array reference if preSelectedIds is undefined
    const stablePreSelectedIds = preSelectedIds ?? EMPTY_ARRAY;
    const [selectedBands, setSelectedBands] = useState<SimilarBand[]>([]);
    const [manuallyAddedBands, setManuallyAddedBands] = useState<SimilarBand[]>([]);
    const [bandSearchOptions, setBandSearchOptions] = useState<{value: number; label: string; band: SimilarBand}[]>([]);
    const [bandSearchLoading, setBandSearchLoading] = useState(false);
    const [localSettings, setLocalSettings] = useState<SearchSettings>(() => ({
        ...loadSavedSettings(),
        ...searchSettings,
    }));

    // Reset selections when modal opens/closes or similarBands change
    // Pre-select bands if preSelectedIds is provided
    useEffect(() => {
        if (open && similarBands) {
            // Pre-select bands that match preSelectedIds
            if (stablePreSelectedIds.length > 0) {
                const preSelected = similarBands.filter(b => stablePreSelectedIds.includes(b.id));
                setSelectedBands(preSelected);
            } else {
                setSelectedBands([]);
            }
            setManuallyAddedBands([]);
            setBandSearchOptions([]);
        }
    }, [open, similarBands, stablePreSelectedIds]);

    // Sync local settings with props
    useEffect(() => {
        if (searchSettings) {
            setLocalSettings(prev => ({...prev, ...searchSettings}));
        }
    }, [searchSettings]);

    // Debounced band search for manual add
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleBandSearch = (searchValue: string) => {
        // Clear previous timeout
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        if (!searchValue || searchValue.length < 2) {
            setBandSearchOptions([]);
            return;
        }

        // Debounce the search
        searchTimeoutRef.current = setTimeout(async () => {
            setBandSearchLoading(true);
            try {
                const result = await fetchBands({
                    name: searchValue,
                    name_filter_type: 'contains',
                    page: 1,
                    page_size: 20,
                });

                // Filter out bands that are already in the list or excluded
                const existingIds = new Set([
                    ...similarBands.map(b => b.id),
                    ...manuallyAddedBands.map(b => b.id),
                    ...(excludeBandId ? [excludeBandId] : []),
                ]);

                const options = result.data
                    .filter(band => !existingIds.has(band.id))
                    .map(band => ({
                        value: band.id,
                        label: band.name,
                        band: {
                            id: band.id,
                            name: band.name,
                            similarity_score: 0, // Manual add = 0 score (shown as "Manual")
                            verified: band.verified ?? false,
                            approved: band.approved ?? false,
                        } as SimilarBand,
                    }));

                setBandSearchOptions(options);
            } catch (error) {
                console.error('Error searching bands:', error);
            } finally {
                setBandSearchLoading(false);
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

    const handleAddManualBand = (bandId: number) => {
        const option = bandSearchOptions.find(o => o.value === bandId);
        if (option) {
            setManuallyAddedBands(prev => [...prev, option.band]);
            setBandSearchOptions([]);
        }
    };

    const handleToggleBand = (band: SimilarBand) => {
        if (selectedBands.some(b => b.id === band.id)) {
            setSelectedBands(selectedBands.filter(b => b.id !== band.id));
        } else {
            if (selectedBands.length < maxSelections) {
                setSelectedBands([...selectedBands, band]);
            } else {
                message.warning(`Maximum ${maxSelections} selections allowed`);
            }
        }
    };

    const handleCancel = () => {
        setSelectedBands([]);
        setManuallyAddedBands([]);
        onCancel();
    };

    const handleMergeSelected = () => {
        if (selectedBands.length === 0) {
            message.warning('Please select at least one band to merge');
            return;
        }

        if (onMergeSelected) {
            onMergeSelected(selectedBands);
        }
    };

    const handleRerunSearch = () => {
        // Save settings to localStorage
        saveSettings(localSettings);
        if (onRerunSearch) {
            onRerunSearch(localSettings);
        }
    };

    // Combine similar bands with manually added bands
    const allBands = [...similarBands, ...manuallyAddedBands];

    // Calculate column count based on number of bands
    const getColumnCount = () => {
        if (allBands.length <= 3) return 2;
        if (allBands.length <= 8) return 3;
        return 4;
    };

    const columnCount = getColumnCount();

    // Create footer buttons based on mode
    const footerButtons = [];

    // Cancel button is always present
    footerButtons.push(
        <Button key="cancel" onClick={handleCancel} disabled={loading}>
            Cancel
        </Button>
    );

    // Add mode-specific buttons
    if (mode === 'select-multiple') {
        // Add a "Skip Merge" button to go directly to edit
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
                disabled={selectedBands.length === 0 || loading}
                loading={loading}
            >
                Compare & Merge ({selectedBands.length})
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
                Create New Band
            </Button>
        );
    }

    return (
        <Modal
            title={mode === 'select-one' ? "Similar Bands Found" : "Select Bands to Merge"}
            open={open}
            onCancel={handleCancel}
            footer={footerButtons}
            width={1200}
        >
            {/* Source Band Display */}
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                        <Tag color="blue" className="text-base px-3 py-1">Source Band</Tag>
                    </div>
                    <div className="flex-1">
                        <Text strong className="text-lg">{newBandName}</Text>
                    </div>
                </div>
                <Text type="secondary" className="block mt-2 text-sm">
                    {mode === 'select-one'
                        ? `Check if this band already exists (${allBands.length} similar found${manuallyAddedBands.length > 0 ? `, ${manuallyAddedBands.length} manually added` : ''})`
                        : `Select bands below that are duplicates of this band to merge (${allBands.length} found${manuallyAddedBands.length > 0 ? `, ${manuallyAddedBands.length} manually added` : ''})`
                    }
                </Text>
            </div>

            {/* Manual Band Add */}
            <div className="mb-4 flex items-center gap-2">
                <SearchOutlined className="text-gray-400" />
                <Select
                    showSearch
                    placeholder="Search and add a band manually..."
                    style={{ flex: 1, maxWidth: 400 }}
                    filterOption={false}
                    onSearch={handleBandSearch}
                    onChange={handleAddManualBand}
                    loading={bandSearchLoading}
                    options={bandSearchOptions}
                    value={null}
                    notFoundContent={bandSearchLoading ? 'Searching...' : 'Type to search bands'}
                />
                <Text type="secondary" className="text-sm">
                    Add bands not found by similarity search
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

                                <div>
                                    <Text className="block mb-2 font-medium">Restrict to Parent</Text>
                                    <Switch
                                        checked={localSettings.restrict_to_parent}
                                        onChange={(checked) => setLocalSettings(prev => ({...prev, restrict_to_parent: checked}))}
                                    />
                                    <Text type="secondary" className="text-xs block mt-1">
                                        Only search within same parent entity
                                    </Text>
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
                {allBands.map((band) => {
                    const isSelected = selectedBands.some(b => b.id === band.id);
                    const isManuallyAdded = manuallyAddedBands.some(b => b.id === band.id);

                    return (
                        <div
                            key={band.id}
                            className={`p-4 border rounded-lg cursor-pointer transition-all ${
                                isSelected
                                    ? 'border-blue-500 bg-blue-50 shadow-md'
                                    : isManuallyAdded
                                    ? 'border-purple-300 bg-purple-50 hover:border-purple-400'
                                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                            }`}
                            onClick={() => mode === 'select-multiple' && handleToggleBand(band)}
                        >
                            <div className="flex items-start gap-3">
                                {mode === 'select-multiple' && (
                                    <Checkbox
                                        checked={isSelected}
                                        onChange={() => handleToggleBand(band)}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                )}
                                <div className="flex-1 min-w-0">
                                    <Text strong className="block truncate" title={band.name}>
                                        {band.name}
                                    </Text>
                                    <Space size="small" wrap className="mt-2">
                                        <StatusTag
                                            verified={band.verified}
                                            approved={band.approved}
                                        />
                                        {isManuallyAdded ? (
                                            <Tag color="purple">
                                                <PlusOutlined /> Manual
                                            </Tag>
                                        ) : (
                                            <Tag color="blue">
                                                {band.similarity_score}% match
                                            </Tag>
                                        )}
                                    </Space>

                                    {mode === 'select-one' && (
                                        <Button
                                            type="primary"
                                            size="small"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onSelect(band);
                                            }}
                                            loading={loading}
                                            disabled={loading}
                                            className="mt-3"
                                            block
                                        >
                                            Select This Band
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
