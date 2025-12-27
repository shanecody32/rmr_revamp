'use client'

import {Col, Divider, Radio, Row, Spin, Typography} from 'antd';
import React from 'react';

import type {BandWithDiscographyResponse} from '@/types/api/bands';

import type {BandComparisonItem} from './types';


const {Text} = Typography;

interface MergeFieldProps {
    field: {
        key: string;
        label: string;
        special?: string;
    };
    allBands: BandComparisonItem[];
    originalBandId: number;
    selectedSourceId: number | null;
    onSelectValue: (fieldKey: string, value: any, sourceId: number) => void;
    renderSpecialField?: (field: string, band: BandComparisonItem) => React.ReactNode;
}

export default function MergeField({
                                       field,
                                       allBands,
                                       originalBandId,
                                       selectedSourceId,
                                       onSelectValue,
                                       renderSpecialField
                                   }: MergeFieldProps) {
    const fieldKey = field.key;

    // Skip hidden fields
    if (field.key === 'country_id' || field.key === 'state_id' || field.key === 'city_id') {
        return null;
    }

    return (
        <div key={field.key} className="mb-6">
            <Text strong className="block mb-2">{field.label}</Text>
            <Radio.Group
                value={selectedSourceId}
                onChange={(e) => {
                    const selectedBandId = e.target.value;

                    if (field.special === 'location') {
                        onSelectValue('location_display', null, selectedBandId);
                    } else {
                        const selectedBand = allBands.find(band => band.id === selectedBandId);
                        if (selectedBand) {
                            onSelectValue(fieldKey, selectedBand.data[fieldKey as keyof BandWithDiscographyResponse], selectedBandId);
                        }
                    }
                }}
                className="w-full"
            >
                <Row gutter={[16, 16]}>
                    {allBands.map(band => {
                        let displayValue;

                        if (field.special === 'location' && renderSpecialField) {
                            // Use the provided render function for special fields
                            displayValue = band.loading ? (
                                <Spin size="small"/>
                            ) : (
                                renderSpecialField('location', band)
                            );
                        } else {
                            // Render normal field value
                            const value = band.data[fieldKey as keyof BandWithDiscographyResponse];
                            displayValue = band.loading
                                ? <Spin size="small"/>
                                : (typeof value === 'boolean'
                                        ? (value ? 'Yes' : 'No')
                                        : (typeof value === 'object' && value !== null
                                            ? JSON.stringify(value)
                                            : (value || '—'))
                                );
                        }

                        return (
                            <Col key={band.id} span={24}>
                                <Radio value={band.id} disabled={band.loading}>
                                    <div className="pl-2">
                                        <Text className={band.id === originalBandId ? 'text-blue-600 font-medium' : ''}>
                                            {band.name}:
                                        </Text>
                                        <Text className="ml-2">
                                            {displayValue}
                                        </Text>
                                    </div>
                                </Radio>
                            </Col>
                        );
                    })}
                </Row>
            </Radio.Group>
            <Divider className="my-4"/>
        </div>
    );
}
