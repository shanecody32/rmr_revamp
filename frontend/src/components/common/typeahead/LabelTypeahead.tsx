'use client'

import {Select} from 'antd';
import {useState} from 'react';

import {fetchSimilarLabels} from '@/lib/api/labels';

interface LabelTypeaheadProps {
    value?: number;
    onChange?: (value: number | undefined, label?: { id: number; name: string }) => void;
    onClear?: () => void;
    allowCreate?: boolean;
    placeholder?: string;
}

export default function LabelTypeahead({
    value,
    onChange,
    onClear,
    placeholder = 'Select label',
}: LabelTypeaheadProps) {
    const [loading, setLoading] = useState(false);
    const [options, setOptions] = useState<{ label: string; value: number }[]>([]);

    const loadOptions = async (search?: string) => {
        if (!search || search.length < 2) {
            setOptions([]);
            return;
        }
        setLoading(true);
        try {
            const labels = await fetchSimilarLabels({
                search_term: search,
                min_similarity: 50,
                limit: 20,
            });
            setOptions(labels.map(label => ({
                label: label.name,
                value: label.id,
            })));
        } catch (error) {
            console.error('Error fetching labels:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (search: string) => {
        await loadOptions(search);
    };

    const handleOpenChange = (open: boolean) => {
        if (open && !options.length) {
            // Load some defaults when opening
            loadOptions('');
        }
    };

    return (
        <Select
            showSearch
            value={value}
            placeholder={placeholder}
            loading={loading}
            onSearch={handleSearch}
            onOpenChange={handleOpenChange}
            onChange={(selectedValue, option) => {
                const selectedOption = Array.isArray(option) ? option[0] : option;
                onChange?.(selectedValue, selectedOption ? {
                    id: selectedValue,
                    name: selectedOption.label as string
                } : undefined);
            }}
            onClear={onClear}
            options={options}
            filterOption={false}
            allowClear
            notFoundContent={loading ? 'Searching...' : 'Type to search labels'}
        />
    );
}
