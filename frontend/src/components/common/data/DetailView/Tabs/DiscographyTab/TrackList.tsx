'use client'

import {Collapse, List, Space, Typography} from 'antd';
import {memo} from 'react';

import type {SongWithTrackInfoResponse} from '@/types/api/songs';

import {formatTrackDuration} from './utils';

const {Text, Link} = Typography;

interface TrackListProps {
    albumId: number;
    tracks: SongWithTrackInfoResponse[];
}

const TrackList = memo(function TrackList({albumId, tracks}: TrackListProps) {
    const items = [
        {
            key: `songs-${albumId}`,
            label: `${tracks.length} Tracks`,
            children: (
                <List
                    size="small"
                    dataSource={tracks}
                    renderItem={(track) => (
                        <List.Item
                            key={`track-${track.song.id}-${albumId}`}
                            actions={[
                                track.song.itunes_url && (
                                    <Link
                                        key={`preview-${track.song.id}-${albumId}`}
                                        href={track.song.itunes_url}
                                        target="_blank"
                                    >
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
                                {track.song.length !== undefined && track.song.length > 0 && (
                                    <Text type="secondary">
                                        {formatTrackDuration(track.song.length)}
                                    </Text>
                                )}
                            </Space>
                        </List.Item>
                    )}
                />
            )
        }
    ];

    return (
        <Collapse
            ghost
            className="mt-2"
            items={items}
        />
    );
});

export default TrackList;
