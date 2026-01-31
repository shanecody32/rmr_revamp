'use client'

import {Alert, Space} from 'antd';
import React, {useMemo} from 'react';

import type {SongComparisonItem} from './types';

interface MergeModalFooterProps {
    allSongs?: SongComparisonItem[];
    primarySongId?: number;
    children?: React.ReactNode;
}

export default function MergeModalFooter({allSongs, primarySongId, children}: MergeModalFooterProps) {
    const stats = useMemo(() => {
        if (!allSongs || !primarySongId) return null;

        const nonPrimarySongs = allSongs.filter(s => s.id !== primarySongId && !s.loading && s.data);
        if (nonPrimarySongs.length === 0) return null;

        return {songCount: nonPrimarySongs.length};
    }, [allSongs, primarySongId]);

    const statsMessage = stats
        ? `Merging ${stats.songCount} song${stats.songCount > 1 ? 's' : ''} will transfer all associated performers, album associations, playlist entries, and statistics into the primary song.`
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
                description="Merging songs will delete the selected duplicate songs and keep only the primary song with the merged data. This action cannot be undone."
                type="warning"
                showIcon
            />
            {children}
        </Space>
    );
}
