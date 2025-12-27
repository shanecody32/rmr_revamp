'use client'

import {Card, Collapse, List, Space, Tag, Typography} from 'antd';

import ResponsiveImage from '@/components/common/layout/ResponsiveImage';
import {formatDate} from '@/lib/utils';
import {getFallbackImageUrl} from '@/lib/utils/media';
import type {AlbumWithRelationsResponse} from '@/types/api/albums';

const {Text, Link} = Typography;

const FALLBACK_IMAGE = getFallbackImageUrl();

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
                <Card
                    key={`album-${album.id}`}
                    size="small"
                    className="w-full"
                >
                    <div className="flex gap-4">
                        <div className="w-24 h-24 flex-shrink-0">
                            <ResponsiveImage
                                alt={album.name}
                                src={album.img}
                                className="rounded"
                                objectFit="cover"
                                fallback={FALLBACK_IMAGE}
                            />
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                                <div>
                                    <Text strong className="text-lg">{album.name}</Text>
                                    <div className="space-y-1">
                                        {album.release_date && (
                                            <Text type="secondary">
                                                Released: {formatDate(album.release_date)}
                                            </Text>
                                        )}
                                        {album.label_id && (
                                            <div>
                                                <Text type="secondary">
                                                    Label ID: {album.label_id}
                                                </Text>
                                            </div>
                                        )}
                                        {album.itunes_url && (
                                            <div>
                                                <Link href={album.itunes_url} target="_blank">
                                                    View on iTunes
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                </div>
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
                                <Collapse
                                    ghost
                                    className="mt-2"
                                    items={[
                                        {
                                            key: `songs-${album.id}`,
                                            label: `${album.songs.length} Tracks`,
                                            children: (
                                                <List
                                                    size="small"
                                                    dataSource={album.songs}
                                                    renderItem={(track) => (
                                                        <List.Item
                                                            key={`track-${track.id}-${album.id}`}
                                                            actions={[
                                                                track.song.itunes_url && (
                                                                    <Link key={`preview-${track.id}`}
                                                                          href={track.song.itunes_url} target="_blank">
                                                                        Preview
                                                                    </Link>
                                                                )
                                                            ]}
                                                        >
                                                            <Space>
                                                                <Text type="secondary" className="w-6">
                                                                    {track.track_number || '-'}.
                                                                </Text>
                                                                <Text>{track.song.name}</Text>
                                                                {track.song.length && track.song.length > 0 && (
                                                                    <Text type="secondary">
                                                                        ({Math.floor(track.song.length / 60000)}:
                                                                        {String(Math.floor((track.song.length % 60000) / 1000)).padStart(2, '0')})
                                                                    </Text>
                                                                )}
                                                            </Space>
                                                        </List.Item>
                                                    )}
                                                />
                                            )
                                        }
                                    ]}
                                />
                            )}
                        </div>
                    </div>
                </Card>
            ))}
        </div>
    );
}
