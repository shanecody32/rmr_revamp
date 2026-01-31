'use client'

import {useMemo} from 'react';

import type {AlbumWithRelationsResponse} from '@/types/api/albums';

import AlbumCard from './AlbumCard';

interface DiscographyTabProps {
    albums: AlbumWithRelationsResponse[];
}

export default function DiscographyTab({albums}: DiscographyTabProps) {
    const sorted = useMemo(() => {
        if (!albums?.length) return [];
        return [...albums].sort((a, b) => {
            if (!a.release_date && !b.release_date) return 0;
            if (!a.release_date) return 1;
            if (!b.release_date) return -1;
            return new Date(b.release_date).getTime() - new Date(a.release_date).getTime();
        });
    }, [albums]);

    if (!sorted.length) {
        return (
            <div className="text-center text-gray-500 p-8">
                No albums found.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {sorted.map((album) => (
                <AlbumCard
                    key={`album-${album.id}`}
                    album={album}
                />
            ))}
        </div>
    );
}