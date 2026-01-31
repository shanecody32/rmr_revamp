'use client'

import {Button, Checkbox, Collapse, Flex, message, Modal, Select, Slider, Space, Tag, Typography} from 'antd';
import {SettingOutlined} from '@ant-design/icons';
import {useEffect, useState} from 'react';

const {Text} = Typography;

// Base interface for entities that have similarity scores
export interface SimilarEntity {
    id: number;
    name: string;
    similarity_score: number;
}

// Search settings for adjustable similarity search
export interface SearchSettings {
    min_similarity: number;  // 20-100, default 40
    limit: number;           // 10-50, default 20
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
    renderItem?: (entity: T, isSelected: boolean) => React.ReactNode;
    /** Function to get entity ID */
    getEntityId?: (entity: T) => number;
    /** Function to get entity name for display */
    getEntityName?: (entity: T) => string;
    /** Custom label for the proceed/skip button */
    proceedButtonLabel?: string;
    /** Custom label for the merge button */
    mergeButtonLabel?: string;
    /** Current search settings */
    searchSettings?: SearchSettings;
    /** Whether to show search settings panel */
    showSearchSettings?: boolean;
}

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
    showSearchSettings = false,
}: SimilarEntitiesModalProps<T>) {
    const [selectedEntities, setSelectedEntities] = useState<T[]>([]);
    const [localSettings, setLocalSettings] = useState<SearchSettings>({
        min_similarity: searchSettings?.min_similarity ?? 40,
        limit: searchSettings?.limit ?? 20,
    });

    // Reset selections when modal opens/closes or similarEntities change
    useEffect(() => {
        if (open && similarEntities) {
            setSelectedEntities([]);
        }
    }, [open, similarEntities]);

    // Sync local settings with props
    useEffect(() => {
        if (searchSettings) {
            setLocalSettings(searchSettings);
        }
    }, [searchSettings]);

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
        if (onRerunSearch) {
            onRerunSearch(localSettings);
        }
    };

    const renderSearchSettings = () => {
        if (!showSearchSettings) return null;

        return (
            <Collapse
                ghost
                className="mb-4"
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
                            <div className="space-y-4">
                                <div>
                                    <Text className="block mb-2">Minimum Similarity: {localSettings.min_similarity}%</Text>
                                    <Slider
                                        min={20}
                                        max={100}
                                        step={5}
                                        value={localSettings.min_similarity}
                                        onChange={(value) => setLocalSettings(prev => ({...prev, min_similarity: value}))}
                                        marks={{
                                            20: '20%',
                                            40: '40%',
                                            60: '60%',
                                            80: '80%',
                                            100: '100%'
                                        }}
                                    />
                                    <Text type="secondary" className="text-xs">
                                        Lower values show more results (broader search), higher values show fewer (stricter matching)
                                    </Text>
                                </div>
                                <div>
                                    <Text className="block mb-2">Max Results:</Text>
                                    <Select
                                        value={localSettings.limit}
                                        onChange={(value) => setLocalSettings(prev => ({...prev, limit: value}))}
                                        style={{width: 120}}
                                        options={[
                                            {value: 10, label: '10'},
                                            {value: 20, label: '20'},
                                            {value: 30, label: '30'},
                                            {value: 50, label: '50'},
                                        ]}
                                    />
                                </div>
                                <Button
                                    type="default"
                                    onClick={handleRerunSearch}
                                    loading={loading}
                                    disabled={loading}
                                >
                                    Rerun Search
                                </Button>
                            </div>
                        ),
                    },
                ]}
            />
        );
    };

    // Capitalize entity name for display
    const capitalizedEntityName = entityName.charAt(0).toUpperCase() + entityName.slice(1);
    const pluralEntityName = `${capitalizedEntityName}s`;

    // Default button labels
    const defaultProceedLabel = mode === 'select-one' ? `Create New ${capitalizedEntityName}` : 'Skip Merge and Edit';
    const defaultMergeLabel = `Compare & Merge (${selectedEntities.length})`;

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
    const defaultRenderItem = (entity: T, isSelected: boolean) => (
        <Flex gap="middle" align="center">
            {mode === 'select-multiple' && (
                <Checkbox
                    checked={isSelected}
                    onChange={() => handleToggleEntity(entity)}
                />
            )}
            <div>
                <div><Text strong>{getEntityName(entity)}</Text></div>
                <Space size="small" className="mt-1">
                    <Tag color="blue">
                        Similarity: {entity.similarity_score}%
                    </Tag>
                </Space>
            </div>
        </Flex>
    );

    // Calculate column count based on number of entities
    const getColumnCount = () => {
        if (similarEntities.length <= 4) return 2;
        if (similarEntities.length <= 9) return 3;
        return 4;
    };

    const columnCount = getColumnCount();

    return (
        <Modal
            title={modalTitle}
            open={open}
            onCancel={handleCancel}
            footer={footerButtons}
            width={1100}
        >
            <div className="mb-4">
                {mode === 'select-one' ? (
                    <p>We found existing {entityName}s with similar names to &quot;{searchedName}&quot;.
                       Please check if the {entityName} already exists:</p>
                ) : (
                    <p>Select the {entityName}s that appear to be duplicates to merge them ({similarEntities.length} found):</p>
                )}
            </div>

            {renderSearchSettings()}

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
                    gap: '12px',
                    maxHeight: '60vh',
                    overflowY: 'auto',
                    padding: '4px',
                }}
            >
                {similarEntities.map((entity) => {
                    const entityId = getEntityId(entity);
                    const isSelected = selectedEntities.some(e => getEntityId(e) === entityId);

                    return (
                        <div
                            key={entityId}
                            className={`p-3 border rounded-lg cursor-pointer transition-all ${
                                isSelected
                                    ? 'border-blue-500 bg-blue-50 shadow-sm'
                                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                            }`}
                            onClick={() => mode === 'select-multiple' && handleToggleEntity(entity)}
                        >
                            {renderItem ? renderItem(entity, isSelected) : defaultRenderItem(entity, isSelected)}

                            {mode === 'select-one' && (
                                <Button
                                    type="link"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSelect(entity);
                                    }}
                                    loading={loading}
                                    disabled={loading}
                                    className="mt-2 p-0"
                                >
                                    Select This {capitalizedEntityName}
                                </Button>
                            )}
                        </div>
                    );
                })}
            </div>
        </Modal>
    );
}
