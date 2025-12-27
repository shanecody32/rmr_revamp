'use client'

import type {AlbumWithRelationsResponse} from '@/types/api/albums';

import AlbumCard from './AlbumCard';

interface DiscographyTabProps {
    albums: AlbumWithRelationsResponse[];
}

export default function DiscographyTab({albums}: DiscographyTabProps) {
    if (!albums?.length) {
        return (
            <div className="text-center text-gray-500 p-8">
                No albums found.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {albums.map((album) => (
                <AlbumCard
                    key={`album-${album.id}`}
                    album={album}
                />
            ))}
        </div>
    );
}