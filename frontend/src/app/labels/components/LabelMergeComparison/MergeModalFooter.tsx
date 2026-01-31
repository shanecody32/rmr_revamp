'use client'

import {Alert, Space} from 'antd';
import React, {useMemo} from 'react';

import type {LabelComparisonItem} from './types';

interface MergeModalFooterProps {
    allLabels?: LabelComparisonItem[];
    primaryLabelId?: number;
    children?: React.ReactNode;
}

export default function MergeModalFooter({allLabels, primaryLabelId, children}: MergeModalFooterProps) {
    const stats = useMemo(() => {
        if (!allLabels || !primaryLabelId) return null;

        const nonPrimaryLabels = allLabels.filter(l => l.id !== primaryLabelId && !l.loading && l.data);
        if (nonPrimaryLabels.length === 0) return null;

        return {labelCount: nonPrimaryLabels.length};
    }, [allLabels, primaryLabelId]);

    const statsMessage = stats
        ? `Merging ${stats.labelCount} label${stats.labelCount > 1 ? 's' : ''} into the primary label. Albums associated with merged labels will be reassigned.`
        : null;

    return (
        <Space direction="vertical" className="w-full mt-6">
            {statsMessage && (
                <Alert
                    message="Merge Statistics"
                    description={statsMessage}
                    type="info"
                    showIcon
                />
            )}
            <Alert
                message="Warning"
                description="Merging labels will delete the selected duplicate labels and keep only the primary label with the merged data. This action cannot be undone."
                type="warning"
                showIcon
            />
            {children}
        </Space>
    );
}
