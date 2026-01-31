'use client'

import {Alert, Space} from 'antd';
import React, {useMemo} from 'react';

import type {BandComparisonItem} from './types';

interface MergeModalFooterProps {
    allBands?: BandComparisonItem[];
    primaryBandId?: number;
    children?: React.ReactNode;
}

export default function MergeModalFooter({allBands, primaryBandId, children}: MergeModalFooterProps) {
    const stats = useMemo(() => {
        if (!allBands || !primaryBandId) return null;

        const nonPrimaryBands = allBands.filter(b => b.id !== primaryBandId && !b.loading && b.data);
        if (nonPrimaryBands.length === 0) return null;

        let totalImages = 0;
        let totalAlbums = 0;
        let totalSongs = 0;

        for (const band of nonPrimaryBands) {
            totalImages += band.data.images?.length ?? 0;
            totalAlbums += band.data.albums?.length ?? 0;
            for (const album of band.data.albums ?? []) {
                totalSongs += album.songs?.length ?? 0;
            }
        }

        return {totalImages, totalAlbums, totalSongs, bandCount: nonPrimaryBands.length};
    }, [allBands, primaryBandId]);

    const statsMessage = stats
        ? `Merging ${stats.bandCount} band${stats.bandCount > 1 ? 's' : ''} will transfer ${stats.totalImages} image${stats.totalImages !== 1 ? 's' : ''}, ${stats.totalAlbums} album${stats.totalAlbums !== 1 ? 's' : ''}, and ${stats.totalSongs} song${stats.totalSongs !== 1 ? 's' : ''} into the primary band.`
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
                description="Merging bands will delete the selected duplicate bands and keep only the primary band with the merged data. This action cannot be undone."
                type="warning"
                showIcon
            />
            {children}
        </Space>
    );
}
