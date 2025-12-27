'use client'

import {Card, Space, Tag, Typography} from 'antd';

import type {AlbumWithRelationsResponse} from '@/types/api/albums';

import AlbumDetails from './AlbumDetails';
import AlbumImage from './AlbumImage';
import TrackList from './TrackList';


const {Text, Link} = Typography;

interface AlbumCardProps {
    album: AlbumWithRelationsResponse;
}

export default function AlbumCard({album}: AlbumCardProps) {
    return (
        <Card
            key={`album-${album.id}`}
            size="small"
            className="w-full"
        >
            <div className="flex gap-4">
                <AlbumImage
                    src={album.img}
                    alt={album.name}
                />

                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                        <AlbumDetails
                            name={album.name}
                            releaseDate={album.release_date}
                            label={album.label_id ? `ID: ${album.label_id}` : undefined}
                            itunesUrl={album.itunes_url}
                        />
                        <Space wrap>
                            {album.genres?.map(genre => (
                                <Tag key={`genre-${genre.id}-${album.id}`} color="blue">
                                    {genre.name}
                                </Tag>
                            ))}
                            {album.sub_genres?.map(subGenre => (
                                <Tag key={`subgenre-${subGenre.id}-${album.id}`} color="purple">
                                    {subGenre.name}
                                </Tag>
                            ))}
                        </Space>
                    </div>

                    {album.songs?.length > 0 && (
                        <TrackList
                            albumId={album.id}
                            tracks={album.songs}
                        />
                    )}
                </div>
            </div>
        </Card>
    );
}
