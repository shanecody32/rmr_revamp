'use client'

import {Alert, Space} from 'antd';
import React, {useMemo} from 'react';

import type {RadioStationComparisonItem} from './types';

interface MergeModalFooterProps {
    allStations?: RadioStationComparisonItem[];
    primaryStationId?: number;
    children?: React.ReactNode;
}

export default function MergeModalFooter({allStations, primaryStationId, children}: MergeModalFooterProps) {
    const stats = useMemo(() => {
        if (!allStations || !primaryStationId) return null;

        const nonPrimaryStations = allStations.filter(s => s.id !== primaryStationId && !s.loading && s.data);
        if (nonPrimaryStations.length === 0) return null;

        return {stationCount: nonPrimaryStations.length};
    }, [allStations, primaryStationId]);

    const statsMessage = stats
        ? `Merging ${stats.stationCount} radio station${stats.stationCount > 1 ? 's' : ''} will transfer all staff members, contacts, playlists, affiliates, and related data into the primary station.`
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
                description="Merging radio stations will delete the selected duplicate stations and keep only the primary station with the merged data. This action cannot be undone."
                type="warning"
                showIcon
            />
            {children}
        </Space>
    );
}
