'use client'

import {Card, Col, Empty, Row, Typography} from 'antd';
import React from 'react';

import type {LabelResponse} from '@/types/api/labels';

import type {LabelComparisonItem, MergeFieldValue} from './types';

const {Title, Text} = Typography;

interface MergePreviewProps {
    originalLabel: LabelComparisonItem | null;
    allLabels: LabelComparisonItem[];
    selectedValues: Record<string, MergeFieldValue>;
    selectedLabelIds: number[];
}

export default function MergePreview({originalLabel, allLabels, selectedValues, selectedLabelIds}: MergePreviewProps) {
    if (!originalLabel) {
        return <div className="text-center">Original label not found</div>;
    }

    // No labels to merge
    if (selectedLabelIds.length === 0) {
        return (
            <Empty
                description={
                    <div>
                        <p>No labels selected for merging.</p>
                        <p>Please add labels to merge or cancel the process.</p>
                    </div>
                }
            />
        );
    }

    // Create a merged label object based on selected values
    const createMergedLabel = (): Partial<LabelResponse> => {
        // Start with the original label data as the base
        const mergedLabel: Partial<LabelResponse> = {...originalLabel.data};

        // Apply all selected values
        Object.entries(selectedValues).forEach(([key, data]) => {
            (mergedLabel as any)[key] = data.value;
        });

        return mergedLabel;
    };

    // Generate the merged label from selections
    const mergedLabel = createMergedLabel();

    return (
        <div className="space-y-6">
            <Card className="shadow-sm">
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                        <Title level={3} className="!mb-1" style={{wordBreak: 'break-word'}}>
                            {mergedLabel.name}
                        </Title>
                        <Text type="secondary">Slug: {mergedLabel.slug}</Text>
                    </div>
                </div>
            </Card>

            <Row gutter={[16, 16]}>
                <Col xs={24}>
                    <Card title="Label Information" size="small">
                        <div className="space-y-3">
                            <div>
                                <Text strong>Name:</Text>{' '}
                                <Text>{mergedLabel.name}</Text>
                            </div>
                            <div>
                                <Text strong>Slug:</Text>{' '}
                                <Text>{mergedLabel.slug}</Text>
                            </div>
                        </div>
                    </Card>
                </Col>

                <Col xs={24}>
                    <Card title="Merge Summary" size="small" className="bg-blue-50">
                        <ul className="list-disc pl-5 space-y-2">
                            <li><Text strong>{originalLabel.name}</Text> will be kept as the primary label.</li>
                            <li>
                                {selectedLabelIds.length === 1 ? 'One label' : `${selectedLabelIds.length} labels`} will be
                                merged into {originalLabel.name}.
                            </li>
                            <li>Albums associated with merged labels will be reassigned to the primary label.</li>
                            <li>Field values have been selected based on your choices.</li>
                        </ul>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}
