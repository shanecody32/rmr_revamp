'use client'

import {Card, Col, Descriptions, Row, Tag, Typography} from 'antd';
import React from 'react';

import type {SongResponse} from '@/types/api/songs';

import type {SongComparisonItem, MergeFieldValue} from './types';

const {Title, Text} = Typography;

interface MergePreviewProps {
    originalSong: SongComparisonItem | null;
    allSongs: SongComparisonItem[];
    selectedValues: Record<string, MergeFieldValue>;
    selectedSongIds: number[];
}

export default function MergePreview({originalSong, allSongs, selectedValues, selectedSongIds}: MergePreviewProps) {
    if (!originalSong) {
        return <div className="text-center">Original song not found</div>;
    }

    // No songs to merge
    if (selectedSongIds.length === 0) {
        return (
            <div className="text-center py-8">
                <p>No songs selected for merging.</p>
                <p>Please add songs to merge or cancel the process.</p>
            </div>
        );
    }

    // Create a merged song object based on selected values
    const createMergedSong = (): Partial<SongResponse> => {
        const mergedSong: Partial<SongResponse> = {...originalSong.data};

        Object.entries(selectedValues).forEach(([key, data]) => {
            (mergedSong as any)[key] = data.value;
        });

        return mergedSong;
    };

    const mergedSong = createMergedSong();

    const hasValue = (value: any): boolean => {
        if (value === undefined || value === null) return false;
        if (typeof value === 'string') return value.trim() !== '';
        return true;
    };

    const formatLength = (length?: number): string => {
        if (!length) return 'Not specified';
        const minutes = Math.floor(length / 60);
        const seconds = length % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className="space-y-6">
            <Card className="shadow-sm">
                <div className="flex-1 min-w-0">
                    <Title level={3} className="!mb-1" style={{wordBreak: 'break-word'}}>
                        {mergedSong.name}
                    </Title>
                    <div className="flex items-center gap-2">
                        {hasValue(mergedSong.band_id) && (
                            <Tag color="blue">Band ID: {mergedSong.band_id}</Tag>
                        )}
                        {hasValue(mergedSong.sub_genre_id) && (
                            <Tag color="purple">Sub-Genre ID: {mergedSong.sub_genre_id}</Tag>
                        )}
                    </div>
                </div>
            </Card>

            <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                    <Card title="Song Metadata" size="small" className="h-full">
                        <div className="space-y-3">
                            <div>
                                <Text strong>Lyrics Writer:</Text>{' '}
                                {hasValue(mergedSong.lyrics_writer) ? (
                                    <Text>{mergedSong.lyrics_writer}</Text>
                                ) : (
                                    <Text type="secondary">Not specified</Text>
                                )}
                            </div>
                            <div>
                                <Text strong>Music Writer:</Text>{' '}
                                {hasValue(mergedSong.music_writer) ? (
                                    <Text>{mergedSong.music_writer}</Text>
                                ) : (
                                    <Text type="secondary">Not specified</Text>
                                )}
                            </div>
                            <div>
                                <Text strong>License:</Text>{' '}
                                {hasValue(mergedSong.license) ? (
                                    <Text>{mergedSong.license}</Text>
                                ) : (
                                    <Text type="secondary">Not specified</Text>
                                )}
                            </div>
                            <div>
                                <Text strong>Publisher:</Text>{' '}
                                {hasValue(mergedSong.publisher) ? (
                                    <Text>{mergedSong.publisher}</Text>
                                ) : (
                                    <Text type="secondary">Not specified</Text>
                                )}
                            </div>
                            <div>
                                <Text strong>Length:</Text>{' '}
                                <Text>{formatLength(mergedSong.length)}</Text>
                            </div>
                            <div>
                                <Text strong>Release Date:</Text>{' '}
                                {hasValue(mergedSong.release_date) ? (
                                    <Text>{mergedSong.release_date}</Text>
                                ) : (
                                    <Text type="secondary">Not specified</Text>
                                )}
                            </div>
                        </div>
                    </Card>
                </Col>

                <Col xs={24} md={12}>
                    <Card title="External IDs" size="small" className="h-full">
                        <div className="space-y-3">
                            {[
                                {key: 'itunes_url', label: 'iTunes URL'},
                                {key: 'itunes_id', label: 'iTunes ID'},
                                {key: 'rovi_id', label: 'Rovi ID'},
                                {key: 'echo_id', label: 'Echo ID'},
                            ].map(item => (
                                <div key={item.key}>
                                    <Text strong>{item.label}:</Text>{' '}
                                    {hasValue(mergedSong[item.key as keyof typeof mergedSong]) ? (
                                        <Tag color="blue">{String(mergedSong[item.key as keyof typeof mergedSong])}</Tag>
                                    ) : (
                                        <Text type="secondary">Not linked</Text>
                                    )}
                                </div>
                            ))}
                        </div>
                    </Card>
                </Col>

                <Col xs={24}>
                    <Card title="Lyrics Preview" size="small">
                        {hasValue(mergedSong.lyrics) ? (
                            <div className="max-h-48 overflow-y-auto whitespace-pre-wrap text-sm">
                                {mergedSong.lyrics}
                            </div>
                        ) : (
                            <Text type="secondary">No lyrics available</Text>
                        )}
                    </Card>
                </Col>

                <Col xs={24}>
                    <Card title="Merge Summary" size="small" className="bg-blue-50">
                        <Descriptions column={{xs: 1, sm: 2}} bordered size="small" className="mb-4">
                            <Descriptions.Item label="Primary Song">
                                <Text strong>{originalSong.name}</Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="Songs to Merge">
                                <Tag color="orange">{selectedSongIds.length}</Tag>
                            </Descriptions.Item>
                        </Descriptions>

                        <ul className="list-disc pl-5 space-y-2">
                            <li><Text strong>{originalSong.name}</Text> will be kept as the primary song.</li>
                            <li>
                                {selectedSongIds.length === 1 ? 'One song' : `${selectedSongIds.length} songs`} will be
                                merged into {originalSong.name}.
                            </li>
                            <li>All performers, album associations, and playlist entries will be preserved.</li>
                            <li>Statistics and rankings will be transferred to the primary song.</li>
                            <li>Field values have been selected based on your choices.</li>
                        </ul>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}
