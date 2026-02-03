'use client'

import {EditOutlined} from '@ant-design/icons';
import {App, Button, Card, Col, Descriptions, Row, Space, Typography} from 'antd';
import Link from 'next/link';
import {use, useEffect, useState} from 'react';

import LoadingSpinner from '@/components/common/feedback/LoadingSpinner';
import {fetchSongById} from '@/lib/api/songs';
import {formatDate} from '@/lib/utils';
import type {SongResponse} from '@/types/api/songs';

const {Title, Text} = Typography;

function formatLength(seconds?: number): string {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

interface SongViewContentProps {
    params: Promise<{id: string; slug: string}>;
}

export default function SongViewContent({params}: SongViewContentProps) {
    const resolvedParams = use(params);
    const {message} = App.useApp();
    const [song, setSong] = useState<SongResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadSong = async () => {
            try {
                setLoading(true);
                const data = await fetchSongById(parseInt(resolvedParams.id));
                setSong(data);
            } catch (error) {
                console.error('Error loading song:', error);
                message.error('Failed to load song');
            } finally {
                setLoading(false);
            }
        };

        loadSong();
    }, [resolvedParams.id, message]);

    if (loading) {
        return <LoadingSpinner className="min-h-screen" />;
    }

    if (!song) {
        return (
            <div className="p-6">
                <Text type="danger">Song not found</Text>
            </div>
        );
    }

    return (
        <div className="p-6">
            <Row gutter={[24, 24]}>
                <Col xs={24}>
                    <Card>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <Title level={3} className="!mb-1">{song.name}</Title>
                                <Text type="secondary">ID: {song.id}</Text>
                            </div>
                            <Space>
                                <Link href={`/songs/edit/${song.id}/${song.slug}`}>
                                    <Button type="primary" icon={<EditOutlined />}>
                                        Edit
                                    </Button>
                                </Link>
                            </Space>
                        </div>

                        <Descriptions bordered column={{xs: 1, sm: 2}} size="small">
                            <Descriptions.Item label="Name">{song.name}</Descriptions.Item>
                            <Descriptions.Item label="Slug">{song.slug}</Descriptions.Item>
                            <Descriptions.Item label="Band ID">{song.band_id}</Descriptions.Item>
                            <Descriptions.Item label="Sub-Genre ID">{song.sub_genre_id}</Descriptions.Item>
                            <Descriptions.Item label="Lyrics Writer">{song.lyrics_writer || '-'}</Descriptions.Item>
                            <Descriptions.Item label="Music Writer">{song.music_writer || '-'}</Descriptions.Item>
                            <Descriptions.Item label="Publisher">{song.publisher || '-'}</Descriptions.Item>
                            <Descriptions.Item label="License">{song.license || '-'}</Descriptions.Item>
                            <Descriptions.Item label="Length">{formatLength(song.length)}</Descriptions.Item>
                            <Descriptions.Item label="Release Date">{song.release_date || '-'}</Descriptions.Item>
                            <Descriptions.Item label="iTunes URL">
                                {song.itunes_url ? (
                                    <a href={song.itunes_url} target="_blank" rel="noopener noreferrer">
                                        {song.itunes_url}
                                    </a>
                                ) : '-'}
                            </Descriptions.Item>
                            <Descriptions.Item label="iTunes ID">{song.itunes_id || '-'}</Descriptions.Item>
                            <Descriptions.Item label="Rovi ID">{song.rovi_id || '-'}</Descriptions.Item>
                            <Descriptions.Item label="Echo ID">{song.echo_id || '-'}</Descriptions.Item>
                            <Descriptions.Item label="Verified">{song.verified ? 'Yes' : 'No'}</Descriptions.Item>
                            <Descriptions.Item label="Approved">{song.approved ? 'Yes' : 'No'}</Descriptions.Item>
                            <Descriptions.Item label="Created">{formatDate(song.created_at)}</Descriptions.Item>
                            <Descriptions.Item label="Updated">{formatDate(song.updated_at)}</Descriptions.Item>
                            {song.lyrics && (
                                <Descriptions.Item label="Lyrics" span={2}>
                                    <pre style={{whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'inherit'}}>{song.lyrics}</pre>
                                </Descriptions.Item>
                            )}
                        </Descriptions>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}
