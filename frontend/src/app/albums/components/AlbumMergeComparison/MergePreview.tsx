'use client'

import {CheckCircleOutlined, WarningOutlined} from '@ant-design/icons';
import {Card, Col, Descriptions, Divider, Empty, Row, Tag, Typography} from 'antd';
import React from 'react';

import DOMPurify from 'dompurify';
import ResponsiveImage from '@/components/common/layout/ResponsiveImage';
import {getAlbumDisplayImageUrl} from '@/lib/utils/media';
import type {AlbumWithRelationsResponse} from '@/types/api/albums';

import type {AlbumComparisonItem, MergeFieldValue} from './types';

const {Title, Text} = Typography;

interface MergePreviewProps {
    originalAlbum: AlbumComparisonItem | null;
    allAlbums: AlbumComparisonItem[];
    selectedValues: Record<string, MergeFieldValue>;
    selectedAlbumIds: number[];
}

export default function MergePreview({originalAlbum, allAlbums, selectedValues, selectedAlbumIds}: MergePreviewProps) {
    if (!originalAlbum) {
        return <div className="text-center">Original album not found</div>;
    }

    // No albums to merge
    if (selectedAlbumIds.length === 0) {
        return (
            <Empty
                description={
                    <div>
                        <p>No albums selected for merging.</p>
                        <p>Please add albums to merge or cancel the process.</p>
                    </div>
                }
            />
        );
    }

    // Create a merged album object based on selected values
    const createMergedAlbum = (): Partial<AlbumWithRelationsResponse> => {
        // Start with the original album data as the base
        const mergedAlbum: Partial<AlbumWithRelationsResponse> = {...originalAlbum.data};

        // Apply all selected values
        Object.entries(selectedValues).forEach(([key, data]) => {
            mergedAlbum[key as keyof AlbumWithRelationsResponse] = data.value;
        });

        return mergedAlbum;
    };

    // Generate the merged album from selections
    const mergedAlbum = createMergedAlbum();

    // Count images, bands, and songs that will be merged
    const totalImages = allAlbums.reduce((sum, album) =>
        sum + (album.data.images?.length || 0), 0);

    const totalBands = allAlbums.reduce((sum, album) =>
        sum + (album.data.bands?.length || 0), 0);

    const totalSongs = allAlbums.reduce((sum, album) =>
        sum + (album.data.songs?.length || 0), 0);

    // Function to check if a value is present
    const hasValue = (value: any): boolean => {
        if (value === undefined || value === null) return false;
        if (typeof value === 'string') return value.trim() !== '';
        return true;
    };

    // Album profile image to display
    const profileImageUrl = getAlbumDisplayImageUrl(originalAlbum.data) ||
        getAlbumDisplayImageUrl(allAlbums.find(album => album.data.images?.length)?.data || {});

    return (
        <div className="space-y-6">
            <Card className="shadow-sm">
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="w-24 h-24 rounded-lg flex-shrink-0 bg-gray-100 overflow-hidden">
                        {profileImageUrl ? (
                            <ResponsiveImage
                                src={profileImageUrl}
                                alt={mergedAlbum.name || ''}
                                className="w-full h-full"
                                objectFit="cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                No Image
                            </div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <Title level={3} className="!mb-1" style={{wordBreak: 'break-word'}}>
                            {mergedAlbum.name}
                        </Title>
                        <div className="flex items-center gap-2 flex-wrap">
                            {mergedAlbum.release_date && (
                                <Tag color="blue">{mergedAlbum.release_date}</Tag>
                            )}
                            {mergedAlbum.compilation && (
                                <Tag color="purple">Compilation</Tag>
                            )}
                            {mergedAlbum.soundtrack && (
                                <Tag color="orange">Soundtrack</Tag>
                            )}
                        </div>
                    </div>
                </div>
            </Card>

            <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                    <Card title="Basic Information" size="small" className="h-full">
                        <div className="space-y-3">
                            <div>
                                <Text strong>Release Date:</Text>{' '}
                                {hasValue(mergedAlbum.release_date) ? (
                                    <Text>{mergedAlbum.release_date}</Text>
                                ) : (
                                    <Text type="secondary">Not specified</Text>
                                )}
                            </div>
                            <div>
                                <Text strong>Label ID:</Text>{' '}
                                {hasValue(mergedAlbum.label_id) ? (
                                    <Text>{mergedAlbum.label_id}</Text>
                                ) : (
                                    <Text type="secondary">Not specified</Text>
                                )}
                            </div>
                            {mergedAlbum.about ? (
                                <div>
                                    <Text strong>About:</Text>
                                    <div className="mt-1" dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(mergedAlbum.about as string)}}/>
                                </div>
                            ) : (
                                <div>
                                    <Text strong>About:</Text> <Text type="secondary">No description available</Text>
                                </div>
                            )}
                        </div>
                    </Card>
                </Col>

                <Col xs={24} md={12}>
                    <Card title="Production Details" size="small" className="h-full">
                        <div className="space-y-3">
                            {[
                                {key: 'producer', label: 'Producer'},
                                {key: 'engineer', label: 'Engineer'},
                                {key: 'studio', label: 'Studio'},
                                {key: 'master', label: 'Master'},
                            ].map(item => (
                                <div key={item.key}>
                                    <Text strong>{item.label}:</Text>{' '}
                                    {hasValue(mergedAlbum[item.key as keyof typeof mergedAlbum]) ? (
                                        <Text>{String(mergedAlbum[item.key as keyof typeof mergedAlbum])}</Text>
                                    ) : (
                                        <Text type="secondary">Not specified</Text>
                                    )}
                                </div>
                            ))}
                        </div>
                    </Card>
                </Col>

                <Col xs={24}>
                    <Card title="External Links & IDs" size="small">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {[
                                {key: 'itunes_url', label: 'iTunes URL'},
                                {key: 'itunes_id', label: 'iTunes ID'},
                                {key: 'cdbaby_url', label: 'CD Baby URL'},
                                {key: 'amazon_url', label: 'Amazon URL'},
                                {key: 'rovi_id', label: 'Rovi ID'},
                            ].map(item => (
                                <div key={item.key}>
                                    <Text strong>{item.label}:</Text>{' '}
                                    {hasValue(mergedAlbum[item.key as keyof typeof mergedAlbum]) ? (
                                        <Tag color="blue">{item.label} available</Tag>
                                    ) : (
                                        <Text type="secondary">Not linked</Text>
                                    )}
                                </div>
                            ))}
                        </div>
                    </Card>
                </Col>

                <Col xs={24}>
                    <Card title="Assets to be Merged" size="small">
                        <Descriptions column={{xs: 1, sm: 3}} bordered>
                            <Descriptions.Item label="Images" span={1}>
                                <div className="flex items-center">
                                    <Tag color={totalImages > 0 ? 'success' : 'warning'}>
                                        {totalImages} images
                                    </Tag>
                                    {totalImages > 0 ? (
                                        <CheckCircleOutlined className="ml-2 text-green-600"/>
                                    ) : (
                                        <WarningOutlined className="ml-2 text-yellow-600"/>
                                    )}
                                </div>
                            </Descriptions.Item>

                            <Descriptions.Item label="Band Associations" span={1}>
                                <div className="flex items-center">
                                    <Tag color={totalBands > 0 ? 'success' : 'warning'}>
                                        {totalBands} bands
                                    </Tag>
                                    {totalBands > 0 ? (
                                        <CheckCircleOutlined className="ml-2 text-green-600"/>
                                    ) : (
                                        <WarningOutlined className="ml-2 text-yellow-600"/>
                                    )}
                                </div>
                            </Descriptions.Item>

                            <Descriptions.Item label="Songs" span={1}>
                                <div className="flex items-center">
                                    <Tag color={totalSongs > 0 ? 'success' : 'warning'}>
                                        {totalSongs} songs
                                    </Tag>
                                    {totalSongs > 0 ? (
                                        <CheckCircleOutlined className="ml-2 text-green-600"/>
                                    ) : (
                                        <WarningOutlined className="ml-2 text-yellow-600"/>
                                    )}
                                </div>
                            </Descriptions.Item>
                        </Descriptions>

                        <Divider className="my-3"/>

                        <div className="text-sm">
                            <p>A total of <strong>{allAlbums.length - 1}</strong> albums will be merged into the primary
                                album.</p>
                            <p>All bands, songs, and images from all albums will be preserved in the merged album.</p>
                        </div>
                    </Card>
                </Col>

                <Col xs={24}>
                    <Card title="Merge Summary" size="small" className="bg-blue-50">
                        <ul className="list-disc pl-5 space-y-2">
                            <li><Text strong>{originalAlbum.name}</Text> will be kept as the primary album.</li>
                            <li>
                                {selectedAlbumIds.length === 1 ? 'One album' : `${selectedAlbumIds.length} albums`} will be
                                merged into {originalAlbum.name}.
                            </li>
                            <li>All bands and songs from all albums will be preserved.</li>
                            <li>All images from all albums will be preserved.</li>
                            <li>Field values have been selected based on your choices.</li>
                        </ul>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}
