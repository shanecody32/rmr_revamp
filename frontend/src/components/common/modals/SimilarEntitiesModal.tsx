'use client'

import {Button, Checkbox, Collapse, Divider, InputNumber, message, Modal, Select, Slider, Space, Switch, Tag, Typography} from 'antd';
import {PlusOutlined, SearchOutlined, SettingOutlined} from '@ant-design/icons';
import {useEffect, useRef, useState} from 'react';

const {Text} = Typography;

// Base interface for entities that have similarity scores
export interface SimilarEntity {
    id: number;
    name: string;
    similarity_score: number;
}

// Search settings for adjustable similarity search
export interface SearchSettings {
    jw_weight: number;       // default 0.6
    dice_weight: number;     // default 0.4
    min_similarity: number;  // default 70
    restrict_to_parent: boolean; // default false
    limit: number;           // default 20
}

export const defaultSearchSettings: SearchSettings = {
    jw_weight: 0.6,
    dice_weight: 0.4,
    min_similarity: 70,
    restrict_to_parent: false,
    limit: 20,
};

// Load settings from localStorage
export const loadSavedSettings = (storageKey: string): SearchSettings => {
    if (typeof window === 'undefined') return defaultSearchSettings;
    try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            return {...defaultSearchSettings, ...JSON.parse(saved)};
        }
    } catch (e) {
        console.error('Error loading saved settings:', e);
    }
    return defaultSearchSettings;
};

// Save settings to localStorage
const saveSettings = (storageKey: string, settings: SearchSettings) => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(storageKey, JSON.stringify(settings));
    } catch (e) {
        console.error('Error saving settings:', e);
    }
};

// Configuration for manual entity search/add
export interface ManualSearchConfig<T extends SimilarEntity> {
    searchEntities: (query: string) => Promise<any[]>;
    mapToSimilar: (entity: any) => T;
    excludeId?: number;
    placeholder?: string;
    helpText?: string;
}

// Props for the generic similar entities modal
export interface SimilarEntitiesModalProps<T extends SimilarEntity> {
    /** Whether the modal is open */
    open: boolean;
    /** Called when the modal is cancelled/closed */
    onCancel: () => void;
    /** Called when a single entity is selected (in select-one mode) */
    onSelect: (entity: T) => void;
    /** Called when user wants to proceed without selecting (skip/create new) */
    onProceed: () => void;
    /** Called when entities are selected for merge (in select-multiple mode) */
    onMergeSelected?: (selected: T[]) => void;
    /** Called when user reruns search with new settings */
    onRerunSearch?: (settings: SearchSettings) => void;
    /** Array of similar entities found */
    similarEntities: T[];
    /** Name of the entity type for display (e.g., "band", "album") */
    entityName: string;
    /** The name that was searched for */
    searchedName: string;
    /** Whether data is loading */
    loading?: boolean;
    /** Selection mode: single select or multiple select */
    mode?: 'select-one' | 'select-multiple';
    /** Maximum number of selections allowed in multi-select mode */
    maxSelections?: number;
    /** Custom render function for list items */
    renderItem?: (entity: T, isSelected: boolean, isManuallyAdded: boolean) => React.ReactNode;
    /** Function to get entity ID */
    getEntityId?: (entity: T) => number;
    /** Function to get entity name for display */
    getEntityName?: (entity: T) => string;
    /** Custom label for the proceed/skip button */
    proceedButtonLabel?: string;
    /** Custom label for the merge button */
    mergeButtonLabel?: string;
    /** Current search settings (partial — merged with defaults) */
    searchSettings?: Partial<SearchSettings>;
    /** When provided, enables localStorage persistence for settings */
    settingsStorageKey?: string;
    /** When provided, enables manual entity add via search dropdown */
    manualSearch?: ManualSearchConfig<T>;
    /** IDs to pre-select when modal opens */
    preSelectedIds?: number[];
    /** When true, hides the restrict_to_parent toggle and forces it to true */
    forceRestrictToParent?: boolean;
}

// Empty array constant to avoid creating new reference on each render
const EMPTY_ARRAY: number[] = [];

export default function SimilarEntitiesModal<T extends SimilarEntity>({
    open,
    onCancel,
    onSelect,
    onProceed,
    onMergeSelected,
    onRerunSearch,
    similarEntities,
    entityName,
    searchedName,
    loading = false,
    mode = 'select-one',
    maxSelections = Infinity,
    renderItem,
    getEntityId = (entity) => entity.id,
    getEntityName = (entity) => entity.name,
    proceedButtonLabel,
    mergeButtonLabel,
    searchSettings,
    settingsStorageKey,
    manualSearch,
    preSelectedIds,
    forceRestrictToParent,
}: SimilarEntitiesModalProps<T>) {
    const stablePreSelectedIds = preSelectedIds ?? EMPTY_ARRAY;
    const [selectedEntities, setSelectedEntities] = useState<T[]>([]);
    const [manuallyAddedEntities, setManuallyAddedEntities] = useState<T[]>([]);
    const [manualSearchOptions, setManualSearchOptions] = useState<{value: number; label: string; entity: T}[]>([]);
    const [manualSearchLoading, setManualSearchLoading] = useState(false);
    const [localSettings, setLocalSettings] = useState<SearchSettings>(() => {
        const base = settingsStorageKey
            ? loadSavedSettings(settingsStorageKey)
            : defaultSearchSettings;
        const merged = {...base, ...searchSettings};
        if (forceRestrictToParent) merged.restrict_to_parent = true;
        return merged;
    });

    // Reset selections when modal opens/closes or similarEntities change
    useEffect(() => {
        if (open && similarEntities) {
            if (stablePreSelectedIds.length > 0) {
                const preSelected = similarEntities.filter(e => stablePreSelectedIds.includes(getEntityId(e)));
                setSelectedEntities(preSelected);
            } else {
                setSelectedEntities([]);
            }
            setManuallyAddedEntities([]);
            setManualSearchOptions([]);
        }
    }, [open, similarEntities, stablePreSelectedIds]);

    // Sync local settings with props
    useEffect(() => {
        if (searchSettings) {
            setLocalSettings(prev => {
                const merged = {...prev, ...searchSettings};
                if (forceRestrictToParent) merged.restrict_to_parent = true;
                return merged;
            });
        }
    }, [searchSettings, forceRestrictToParent]);

    // Debounced manual search
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleManualSearch = (searchValue: string) => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        if (!searchValue || searchValue.length < 2 || !manualSearch) {
            setManualSearchOptions([]);
            return;
        }

        searchTimeoutRef.current = setTimeout(async () => {
            setManualSearchLoading(true);
            try {
                const results = await manualSearch.searchEntities(searchValue);

                const existingIds = new Set([
                    ...similarEntities.map(e => getEntityId(e)),
                    ...manuallyAddedEntities.map(e => getEntityId(e)),
                    ...(manualSearch.excludeId ? [manualSearch.excludeId] : []),
                ]);

                const options = results
                    .filter((item: any) => !existingIds.has(item.id))
                    .map((item: any) => {
                        const mapped = manualSearch.mapToSimilar(item);
                        return {
                            value: getEntityId(mapped),
                            label: getEntityName(mapped),
                            entity: mapped,
                        };
                    });

                setManualSearchOptions(options);
            } catch (error) {
                console.error('Error searching entities:', error);
            } finally {
                setManualSearchLoading(false);
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

    const handleAddManualEntity = (entityId: number) => {
        const option = manualSearchOptions.find(o => o.value === entityId);
        if (option) {
            setManuallyAddedEntities(prev => [...prev, option.entity]);
            setManualSearchOptions([]);
        }
    };

    const handleToggleEntity = (entity: T) => {
        const entityId = getEntityId(entity);
        if (selectedEntities.some(e => getEntityId(e) === entityId)) {
            setSelectedEntities(selectedEntities.filter(e => getEntityId(e) !== entityId));
        } else {
            if (selectedEntities.length < maxSelections) {
                setSelectedEntities([...selectedEntities, entity]);
            } else {
                message.warning(`Maximum ${maxSelections} selections allowed`);
            }
        }
    };

    const handleCancel = () => {
        setSelectedEntities([]);
        setManuallyAddedEntities([]);
        onCancel();
    };

    const handleMergeSelected = () => {
        if (selectedEntities.length === 0) {
            message.warning(`Please select at least one ${entityName} to merge`);
            return;
        }

        if (onMergeSelected) {
            onMergeSelected(selectedEntities);
        }
    };

    const handleRerunSearch = () => {
        if (settingsStorageKey) {
            saveSettings(settingsStorageKey, localSettings);
        }
        if (onRerunSearch) {
            onRerunSearch(localSettings);
        }
    };

    // Combine similar entities with manually added entities
    const allEntities = [...similarEntities, ...manuallyAddedEntities];

    // Capitalize entity name for display
    const capitalizedEntityName = entityName.charAt(0).toUpperCase() + entityName.slice(1);
    const pluralEntityName = `${capitalizedEntityName}s`;

    // Calculate column count based on number of entities
    const getColumnCount = () => {
        if (allEntities.length <= 3) return 2;
        if (allEntities.length <= 8) return 3;
        return 4;
    };

    const columnCount = getColumnCount();

    // Default button labels
    const defaultProceedLabel = mode === 'select-one' ? `Create New ${capitalizedEntityName}` : 'Skip Merge and Edit';
    const defaultMergeLabel = `Compare & Merge (${selectedEntities.length})`;

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
                {proceedButtonLabel || defaultProceedLabel}
            </Button>
        );

        footerButtons.push(
            <Button
                key="merge"
                type="primary"
                onClick={handleMergeSelected}
                disabled={selectedEntities.length === 0 || loading}
                loading={loading}
            >
                {mergeButtonLabel || defaultMergeLabel}
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
                {proceedButtonLabel || defaultProceedLabel}
            </Button>
        );
    }

    // Modal title based on mode
    const modalTitle = mode === 'select-one'
        ? `Similar ${pluralEntityName} Found`
        : `Select ${pluralEntityName} to Merge`;

    // Default item renderer
    const defaultRenderItem = (entity: T, isSelected: boolean, isManuallyAdded: boolean) => (
        <div className="flex items-start gap-3">
            {mode === 'select-multiple' && (
                <Checkbox
                    checked={isSelected}
                    onChange={() => handleToggleEntity(entity)}
                    onClick={(e) => e.stopPropagation()}
                />
            )}
            <div className="flex-1 min-w-0">
                <Text strong className="block truncate" title={getEntityName(entity)}>
                    {getEntityName(entity)}
                </Text>
                <Space size="small" wrap className="mt-2">
                    {isManuallyAdded ? (
                        <Tag color="purple">
                            <PlusOutlined /> Manual
                        </Tag>
                    ) : (
                        <Tag color="blue">
                            {entity.similarity_score}% match
                        </Tag>
                    )}
                </Space>

                {mode === 'select-one' && (
                    <Button
                        type="primary"
                        size="small"
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelect(entity);
                        }}
                        loading={loading}
                        disabled={loading}
                        className="mt-3"
                        block
                    >
                        Select This {capitalizedEntityName}
                    </Button>
                )}
            </div>
        </div>
    );

    return (
        <Modal
            title={modalTitle}
            open={open}
            onCancel={handleCancel}
            footer={footerButtons}
            width={1200}
        >
            {/* Source Entity Banner */}
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                        <Tag color="blue" className="text-base px-3 py-1">Source {capitalizedEntityName}</Tag>
                    </div>
                    <div className="flex-1">
                        <Text strong className="text-lg">{searchedName}</Text>
                    </div>
                </div>
                <Text type="secondary" className="block mt-2 text-sm">
                    {mode === 'select-one'
                        ? `Check if this ${entityName} already exists (${allEntities.length} similar found${manuallyAddedEntities.length > 0 ? `, ${manuallyAddedEntities.length} manually added` : ''})`
                        : `Select ${entityName}s below that are duplicates of this ${entityName} to merge (${allEntities.length} found${manuallyAddedEntities.length > 0 ? `, ${manuallyAddedEntities.length} manually added` : ''})`
                    }
                </Text>
            </div>

            {/* Manual Entity Add */}
            {manualSearch && (
                <div className="mb-4 flex items-center gap-2">
                    <SearchOutlined className="text-gray-400" />
                    <Select
                        showSearch
                        placeholder={manualSearch.placeholder || `Search and add a ${entityName} manually...`}
                        style={{flex: 1, maxWidth: 400}}
                        filterOption={false}
                        onSearch={handleManualSearch}
                        onChange={handleAddManualEntity}
                        loading={manualSearchLoading}
                        options={manualSearchOptions}
                        value={null}
                        notFoundContent={manualSearchLoading ? 'Searching...' : manualSearch.helpText || `Type to search ${entityName}s`}
                    />
                    <Text type="secondary" className="text-sm">
                        {`Add ${entityName}s not found by similarity search`}
                    </Text>
                </div>
            )}

            {(manualSearch) && <Divider className="my-3" />}

            {/* Search Settings Panel */}
            {onRerunSearch && (
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

                                    {!forceRestrictToParent && (
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
                                    )}

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
            )}

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
                {allEntities.map((entity) => {
                    const entityId = getEntityId(entity);
                    const isSelected = selectedEntities.some(e => getEntityId(e) === entityId);
                    const isManuallyAdded = manuallyAddedEntities.some(e => getEntityId(e) === entityId);

                    return (
                        <div
                            key={entityId}
                            className={`p-4 border rounded-lg cursor-pointer transition-all ${
                                isSelected
                                    ? 'border-blue-500 bg-blue-50 shadow-md'
                                    : isManuallyAdded
                                    ? 'border-purple-300 bg-purple-50 hover:border-purple-400'
                                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                            }`}
                            onClick={() => mode === 'select-multiple' && handleToggleEntity(entity)}
                        >
                            {renderItem
                                ? renderItem(entity, isSelected, isManuallyAdded)
                                : defaultRenderItem(entity, isSelected, isManuallyAdded)
                            }
                        </div>
                    );
                })}
            </div>
        </Modal>
    );
}
