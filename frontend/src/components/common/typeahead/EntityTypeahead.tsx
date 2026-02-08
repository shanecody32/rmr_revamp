'use client'

import {Select, Spin} from 'antd';
import {useEffect, useState} from 'react';
import {useDebouncedValue} from '@/hooks/useDebouncedValue';

export interface EntityTypeaheadProps<T> {
    // Basic props
    value?: number;
    onChange?: (value: number | undefined, entity?: T) => void;
    onClear?: () => void;
    disabled?: boolean;
    placeholder?: string;

    // Entity-specific props
    fetchOptions: (search: string, params?: Record<string, any>) => Promise<T[]>;
    fetchById?: (id: number) => Promise<T | null>;
    dependencies?: Record<string, any>; // Dependencies that should trigger reset when changed
    dependenciesRequired?: boolean; // Whether all dependencies are required to enable the component

    // Customization
    getOptionLabel: (entity: T) => string;
    getOptionValue: (entity: T) => number;
    idKey?: keyof T; // Default 'id'
    nameKey?: keyof T; // Default 'name'
}

export function EntityTypeahead<T extends { id: number; name: string }>({
                                                                            // Basic props
                                                                            value,
                                                                            onChange,
                                                                            onClear,
                                                                            disabled = false,
                                                                            placeholder = "Select...",

                                                                            // Entity-specific props
                                                                            fetchOptions,
                                                                            fetchById,
                                                                            dependencies = {},
                                                                            dependenciesRequired = false,

                                                                            // Customization
                                                                            getOptionLabel = (entity: T) => entity.name,
                                                                            getOptionValue = (entity: T) => entity.id,
                                                                            idKey = 'id' as keyof T,
                                                                            nameKey = 'name' as keyof T
                                                                        }: EntityTypeaheadProps<T>) {
    const [loading, setLoading] = useState(false);
    const [options, setOptions] = useState<{ label: string; value: number }[]>([]);
    const [currentEntity, setCurrentEntity] = useState<T | null>(null);
    const [searchInput, setSearchInput] = useState('');
    const debouncedSearch = useDebouncedValue(searchInput, 300);

    // Check if dependencies are fulfilled
    const dependenciesUnfulfilled = dependenciesRequired &&
        Object.values(dependencies).some(dep => dep === undefined || dep === null);

    // Extract dependency values for the dependency array
    const dependencyValues = Object.values(dependencies);

    // Reset when dependencies change
    useEffect(() => {
        if (dependenciesRequired) {
            // If any dependency changes and is required, reset
            onChange?.(undefined, undefined);
            setCurrentEntity(null);
            setOptions([]);
        }
    }, [dependencyValues, dependenciesRequired, onChange]);

    // Load entity by ID when value changes or on initial load
    useEffect(() => {
        const loadEntityById = async () => {
            if (!value || !fetchById) {
                setCurrentEntity(null);
                return;
            }

            // Skip if we already have this entity
            if (currentEntity && getOptionValue(currentEntity) === value) {
                return;
            }

            setLoading(true);
            try {
                const entity = await fetchById(value);

                if (entity) {
                    setCurrentEntity(entity);

                    // Set the option in the Select component
                    setOptions([{
                        label: getOptionLabel(entity),
                        value: getOptionValue(entity)
                    }]);
                } else {
                    // If entity not found, create a placeholder option
                    setOptions([{
                        label: `ID: ${value}`,
                        value
                    }]);
                }
            } catch (error) {
                console.error(`Error loading entity with id ${value}:`, error);
            } finally {
                setLoading(false);
            }
        };

        // Only run if we have a fetchById function
        if (fetchById) {
            loadEntityById();
        }
    }, [value, currentEntity, fetchById, getOptionLabel, getOptionValue]);

    useEffect(() => {
        if (!debouncedSearch || debouncedSearch.length < 2) {
            return;
        }

        // If dependencies are required but unfulfilled, don't search
        if (dependenciesUnfulfilled) {
            return;
        }

        const doSearch = async () => {
            setLoading(true);
            try {
                const entitiesData = await fetchOptions(debouncedSearch, dependencies);
                setOptions(entitiesData.map(entity => ({
                    label: getOptionLabel(entity),
                    value: getOptionValue(entity)
                })));
            } catch (error) {
                console.error('Error fetching options:', error);
            } finally {
                setLoading(false);
            }
        };

        doSearch();
    }, [debouncedSearch, dependenciesUnfulfilled, fetchOptions, dependencies, getOptionLabel, getOptionValue]);

    // Determine if component should be disabled
    const isDisabled = disabled || dependenciesUnfulfilled;

    return (
        <Select
            showSearch
            value={value}
            placeholder={placeholder}
            loading={loading}
            onSearch={setSearchInput}
            onChange={(value, option) => {
                const selectedEntity = value ? {
                    ...currentEntity,
                    [idKey]: value,
                    [nameKey]: (option && typeof option === 'object' && !Array.isArray(option)) ? option.label : `ID: ${value}`
                } as T : undefined;

                onChange?.(value, selectedEntity);

                if (selectedEntity) {
                    setCurrentEntity(selectedEntity as T);
                } else {
                    setCurrentEntity(null);
                }
            }}
            onClear={() => {
                onClear?.();
                setCurrentEntity(null);
            }}
            options={options}
            filterOption={false}
            allowClear
            disabled={isDisabled}
            notFoundContent={loading ? <Spin size="small"/> : null}
        />
    );
}
