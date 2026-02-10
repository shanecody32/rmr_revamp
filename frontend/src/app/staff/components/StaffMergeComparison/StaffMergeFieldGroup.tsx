'use client'

import {Col, Radio, Row, Spin, Typography} from 'antd';
import React from 'react';

import type {StaffDetailView} from '@/types/api/staff';

import type {FieldGroup, MergeFieldValue, StaffComparisonItem} from './types';

const {Text} = Typography;

interface StaffMergeFieldGroupProps {
    fieldGroup: FieldGroup;
    allStaff: StaffComparisonItem[];
    primaryStaffId: number;
    selectedValues: Record<string, MergeFieldValue>;
    onSelectValue: (fieldKey: string, value: any, sourceId: number) => void;
}

export default function StaffMergeFieldGroup({
                                                 fieldGroup,
                                                 allStaff,
                                                 primaryStaffId,
                                                 selectedValues,
                                                 onSelectValue,
                                             }: StaffMergeFieldGroupProps) {
    const staffCount = allStaff.length;
    const staffColSpan = Math.floor(20 / staffCount);

    const handleSelectValue = (fieldKey: string, staffId: number) => {
        const selectedStaff = allStaff.find(s => s.id === staffId);
        if (selectedStaff) {
            onSelectValue(fieldKey, selectedStaff.data[fieldKey as keyof StaffDetailView], staffId);
        }
    };

    const getDisplayValue = (staff: StaffComparisonItem, fieldKey: string) => {
        if (staff.loading) {
            return <Spin size="small"/>;
        }

        const value = staff.data[fieldKey as keyof StaffDetailView];
        if (typeof value === 'boolean') {
            return value ? 'Yes' : 'No';
        }
        if (typeof value === 'object' && value !== null) {
            return JSON.stringify(value);
        }
        return value || <span className="text-gray-400">&mdash;</span>;
    };

    return (
        <div className="merge-field-group">
            {/* Header row with staff names */}
            <Row gutter={[16, 0]} className="mb-4 pb-2 border-b border-gray-200">
                <Col span={4}>
                    <Text strong className="text-gray-500">Field</Text>
                </Col>
                {allStaff.map(staff => (
                    <Col key={staff.id} span={staffColSpan}>
                        <Text strong className={staff.id === primaryStaffId ? 'text-blue-600' : ''}>
                            {staff.name}
                            {staff.id === primaryStaffId && <span className="text-xs ml-1">(Primary)</span>}
                        </Text>
                    </Col>
                ))}
            </Row>

            {/* Field rows */}
            {fieldGroup.fields.map(field => {
                const selectedSourceId = selectedValues[field.key]?.sourceId ?? null;

                return (
                    <Row
                        key={field.key}
                        gutter={[16, 0]}
                        className="py-3 border-b border-gray-100 hover:bg-gray-50 items-start"
                    >
                        <Col span={4}>
                            <Text strong className="text-gray-700">{field.label}</Text>
                        </Col>

                        {allStaff.map(staff => (
                            <Col key={staff.id} span={staffColSpan}>
                                <Radio
                                    checked={selectedSourceId === staff.id}
                                    onChange={() => handleSelectValue(field.key, staff.id)}
                                    disabled={staff.loading}
                                    className="w-full"
                                >
                                    <div className={`pl-1 ${selectedSourceId === staff.id ? 'font-medium' : ''}`}>
                                        {getDisplayValue(staff, field.key)}
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
