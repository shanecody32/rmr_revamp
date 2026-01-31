'use client'

import {Alert, Space} from 'antd';
import React, {useMemo} from 'react';

import type {AlbumComparisonItem} from './types';

interface MergeModalFooterProps {
    allAlbums?: AlbumComparisonItem[];
    primaryAlbumId?: number;
    children?: React.ReactNode;
}

export default function MergeModalFooter({allAlbums, primaryAlbumId, children}: MergeModalFooterProps) {
    const stats = useMemo(() => {
        if (!allAlbums || !primaryAlbumId) return null;

        const nonPrimaryAlbums = allAlbums.filter(a => a.id !== primaryAlbumId && !a.loading && a.data);
        if (nonPrimaryAlbums.length === 0) return null;

        let totalImages = 0;
        let totalBands = 0;
        let totalSongs = 0;

        for (const album of nonPrimaryAlbums) {
            totalImages += album.data.images?.length ?? 0;
            totalBands += album.data.bands?.length ?? 0;
            totalSongs += album.data.songs?.length ?? 0;
        }

        return {totalImages, totalBands, totalSongs, albumCount: nonPrimaryAlbums.length};
    }, [allAlbums, primaryAlbumId]);

    const statsMessage = stats
        ? `Merging ${stats.albumCount} album${stats.albumCount > 1 ? 's' : ''} will transfer ${stats.totalImages} image${stats.totalImages !== 1 ? 's' : ''}, ${stats.totalBands} band association${stats.totalBands !== 1 ? 's' : ''}, and ${stats.totalSongs} song${stats.totalSongs !== 1 ? 's' : ''} into the primary album.`
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
                description="Merging albums will delete the selected duplicate albums and keep only the primary album with the merged data. This action cannot be undone."
                type="warning"
                showIcon
            />
            {children}
        </Space>
    );
}
