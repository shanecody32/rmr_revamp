'use client'

import {Col, Radio, Row, Spin, Typography} from 'antd';
import React from 'react';

import type {BandWithDiscographyResponse} from '@/types/api/bands';

import type {BandComparisonItem, FieldGroup, MergeFieldValue} from './types';

const {Text} = Typography;

interface MergeFieldGroupProps {
    fieldGroup: FieldGroup;
    allBands: BandComparisonItem[];
    primaryBandId: number;
    selectedValues: Record<string, MergeFieldValue>;
    onSelectValue: (fieldKey: string, value: any, sourceId: number) => void;
    renderSpecialField?: (field: string, band: BandComparisonItem) => React.ReactNode;
}

export default function MergeFieldGroup({
                                            fieldGroup,
                                            allBands,
                                            primaryBandId,
                                            selectedValues,
                                            onSelectValue,
                                            renderSpecialField
                                        }: MergeFieldGroupProps) {
    // Calculate column span based on number of bands (minimum 2 columns for field label + bands)
    const bandCount = allBands.length;
    // Label column takes 4, remaining 20 split among bands
    const bandColSpan = Math.floor(20 / bandCount);

    const handleSelectValue = (fieldKey: string, bandId: number, isSpecialLocation: boolean) => {
        if (isSpecialLocation) {
            onSelectValue('location_display', null, bandId);
        } else {
            const selectedBand = allBands.find(band => band.id === bandId);
            if (selectedBand) {
                onSelectValue(fieldKey, selectedBand.data[fieldKey as keyof BandWithDiscographyResponse], bandId);
            }
        }
    };

    const getDisplayValue = (band: BandComparisonItem, fieldKey: string, isSpecialLocation: boolean) => {
        if (band.loading) {
            return <Spin size="small" />;
        }

        if (isSpecialLocation && renderSpecialField) {
            return renderSpecialField('location', band);
        }

        const value = band.data[fieldKey as keyof BandWithDiscographyResponse];
        if (typeof value === 'boolean') {
            return value ? 'Yes' : 'No';
        }
        if (typeof value === 'object' && value !== null) {
            return JSON.stringify(value);
        }
        return value || <span className="text-gray-400">—</span>;
    };

    const getSelectedSourceId = (field: { key: string; special?: string }) => {
        if (field.special === 'location') {
            return selectedValues.country_id?.sourceId ?? null;
        }
        return selectedValues[field.key]?.sourceId ?? null;
    };

    return (
        <div className="merge-field-group">
            {/* Header row with band names */}
            <Row gutter={[16, 0]} className="mb-4 pb-2 border-b border-gray-200">
                <Col span={4}>
                    <Text strong className="text-gray-500">Field</Text>
                </Col>
                {allBands.map(band => (
                    <Col key={band.id} span={bandColSpan}>
                        <Text strong className={band.id === primaryBandId ? 'text-blue-600' : ''}>
                            {band.name}
                            {band.id === primaryBandId && <span className="text-xs ml-1">(Primary)</span>}
                        </Text>
                    </Col>
                ))}
            </Row>

            {/* Field rows */}
            {fieldGroup.fields.map(field => {
                const isSpecialLocation = field.special === 'location';
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

                        {/* Band values as columns */}
                        {allBands.map(band => (
                            <Col key={band.id} span={bandColSpan}>
                                <Radio
                                    checked={selectedSourceId === band.id}
                                    onChange={() => handleSelectValue(field.key, band.id, isSpecialLocation)}
                                    disabled={band.loading}
                                    className="w-full"
                                >
                                    <div className={`pl-1 ${selectedSourceId === band.id ? 'font-medium' : ''}`}>
                                        {getDisplayValue(band, field.key, isSpecialLocation)}
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
