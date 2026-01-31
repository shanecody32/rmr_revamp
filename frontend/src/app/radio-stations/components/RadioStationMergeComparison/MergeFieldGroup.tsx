'use client'

import {Col, Radio, Row, Spin, Typography} from 'antd';
import React from 'react';

import type {RadioStationResponse} from '@/types/api/radio-stations';

import type {RadioStationComparisonItem, FieldGroup, MergeFieldValue} from './types';

const {Text} = Typography;

interface MergeFieldGroupProps {
    fieldGroup: FieldGroup;
    allStations: RadioStationComparisonItem[];
    primaryStationId: number;
    selectedValues: Record<string, MergeFieldValue>;
    onSelectValue: (fieldKey: string, value: any, sourceId: number) => void;
}

export default function MergeFieldGroup({
                                            fieldGroup,
                                            allStations,
                                            primaryStationId,
                                            selectedValues,
                                            onSelectValue,
                                        }: MergeFieldGroupProps) {
    // Calculate column span based on number of stations (minimum 2 columns for field label + stations)
    const stationCount = allStations.length;
    // Label column takes 4, remaining 20 split among stations
    const stationColSpan = Math.floor(20 / stationCount);

    const handleSelectValue = (fieldKey: string, stationId: number) => {
        const selectedStation = allStations.find(station => station.id === stationId);
        if (selectedStation) {
            onSelectValue(fieldKey, selectedStation.data[fieldKey as keyof RadioStationResponse], stationId);
        }
    };

    const getDisplayValue = (station: RadioStationComparisonItem, fieldKey: string) => {
        if (station.loading) {
            return <Spin size="small" />;
        }

        const value = station.data[fieldKey as keyof RadioStationResponse];
        if (typeof value === 'boolean') {
            return value ? 'Yes' : 'No';
        }
        if (typeof value === 'object' && value !== null) {
            return JSON.stringify(value);
        }
        return value || <span className="text-gray-400">&mdash;</span>;
    };

    const getSelectedSourceId = (fieldKey: string) => {
        return selectedValues[fieldKey]?.sourceId ?? null;
    };

    return (
        <div className="merge-field-group">
            {/* Header row with station names */}
            <Row gutter={[16, 0]} className="mb-4 pb-2 border-b border-gray-200">
                <Col span={4}>
                    <Text strong className="text-gray-500">Field</Text>
                </Col>
                {allStations.map(station => (
                    <Col key={station.id} span={stationColSpan}>
                        <Text strong className={station.id === primaryStationId ? 'text-blue-600' : ''}>
                            {station.name}
                            {station.id === primaryStationId && <span className="text-xs ml-1">(Primary)</span>}
                        </Text>
                    </Col>
                ))}
            </Row>

            {/* Field rows */}
            {fieldGroup.fields.map(field => {
                const selectedSourceId = getSelectedSourceId(field.key);

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

                        {/* Station values as columns */}
                        {allStations.map(station => (
                            <Col key={station.id} span={stationColSpan}>
                                <Radio
                                    checked={selectedSourceId === station.id}
                                    onChange={() => handleSelectValue(field.key, station.id)}
                                    disabled={station.loading}
                                    className="w-full"
                                >
                                    <div className={`pl-1 ${selectedSourceId === station.id ? 'font-medium' : ''}`}>
                                        {getDisplayValue(station, field.key)}
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
