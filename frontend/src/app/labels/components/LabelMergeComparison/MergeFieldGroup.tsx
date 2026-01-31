'use client'

import {Col, Radio, Row, Spin, Typography} from 'antd';
import React from 'react';

import type {LabelResponse} from '@/types/api/labels';

import type {LabelComparisonItem, FieldGroup, MergeFieldValue} from './types';

const {Text} = Typography;

interface MergeFieldGroupProps {
    fieldGroup: FieldGroup;
    allLabels: LabelComparisonItem[];
    primaryLabelId: number;
    selectedValues: Record<string, MergeFieldValue>;
    onSelectValue: (fieldKey: string, value: any, sourceId: number) => void;
}

export default function MergeFieldGroup({
                                            fieldGroup,
                                            allLabels,
                                            primaryLabelId,
                                            selectedValues,
                                            onSelectValue,
                                        }: MergeFieldGroupProps) {
    // Calculate column span based on number of labels (minimum 2 columns for field label + labels)
    const labelCount = allLabels.length;
    // Label column takes 4, remaining 20 split among labels
    const labelColSpan = Math.floor(20 / labelCount);

    const handleSelectValue = (fieldKey: string, labelId: number) => {
        const selectedLabel = allLabels.find(label => label.id === labelId);
        if (selectedLabel) {
            onSelectValue(fieldKey, selectedLabel.data[fieldKey as keyof LabelResponse], labelId);
        }
    };

    const getDisplayValue = (label: LabelComparisonItem, fieldKey: string) => {
        if (label.loading) {
            return <Spin size="small" />;
        }

        const value = label.data[fieldKey as keyof LabelResponse];
        if (typeof value === 'boolean') {
            return value ? 'Yes' : 'No';
        }
        if (typeof value === 'object' && value !== null) {
            return JSON.stringify(value);
        }
        return value || <span className="text-gray-400">—</span>;
    };

    const getSelectedSourceId = (field: { key: string; special?: string }) => {
        return selectedValues[field.key]?.sourceId ?? null;
    };

    return (
        <div className="merge-field-group">
            {/* Header row with label names */}
            <Row gutter={[16, 0]} className="mb-4 pb-2 border-b border-gray-200">
                <Col span={4}>
                    <Text strong className="text-gray-500">Field</Text>
                </Col>
                {allLabels.map(label => (
                    <Col key={label.id} span={labelColSpan}>
                        <Text strong className={label.id === primaryLabelId ? 'text-blue-600' : ''}>
                            {label.name}
                            {label.id === primaryLabelId && <span className="text-xs ml-1">(Primary)</span>}
                        </Text>
                    </Col>
                ))}
            </Row>

            {/* Field rows */}
            {fieldGroup.fields.map(field => {
                const selectedSourceId = getSelectedSourceId(field);

                return (
                    <Row
                        key={field.key}
                        gutter={[16, 0]}
                        className="py-3 border-b border-gray-100 hover:bg-gray-50 items-start"
                    >
                        {/* Field label */}
                        <Col span={4}>
                            <Text strong className="text-gray-700">{field.label}</Text>
                        </Col>

                        {/* Label values as columns */}
                        {allLabels.map(label => (
                            <Col key={label.id} span={labelColSpan}>
                                <Radio
                                    checked={selectedSourceId === label.id}
                                    onChange={() => handleSelectValue(field.key, label.id)}
                                    disabled={label.loading}
                                    className="w-full"
                                >
                                    <div className={`pl-1 ${selectedSourceId === label.id ? 'font-medium' : ''}`}>
                                        {getDisplayValue(label, field.key)}
                                    </div>
                                </Radio>
                            </Col>
                        ))}
                    </Row>
                );
            })}
        </div>
    );
}
