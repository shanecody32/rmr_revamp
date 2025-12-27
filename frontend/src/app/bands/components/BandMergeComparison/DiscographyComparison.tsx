'use client'

import {Card, Col, Empty, Row, Spin, Tag, Typography} from 'antd';
import React from 'react';

import ResponsiveImage from '@/components/common/layout/ResponsiveImage';
import {getFallbackImageUrl} from '@/lib/utils/media';

import type {BandComparisonItem} from './types';

const {Text} = Typography;

const FALLBACK_IMAGE = getFallbackImageUrl();

interface DiscographyComparisonProps {
    allBands: BandComparisonItem[];
    originalBandId: number;
}

export default function DiscographyComparison({allBands, originalBandId}: DiscographyComparisonProps) {
    return (
        <div className="mb-6">
            <Text strong className="block mb-4">Albums</Text>
            <div className="text-sm mb-4">
                All albums from all bands will be preserved in the merged band.
            </div>

            <Row gutter={[16, 16]}>
                {allBands.map(band => (
                    <Col key={band.id} span={24}>
                        <div className="mb-4">
                            <Text strong className={band.id === originalBandId ? 'text-blue-600' : ''}>
                                {band.name}
                            </Text>
                            {band.loading ? (
                                <Spin/>
                            ) : !band.data.albums || band.data.albums.length === 0 ? (
                                <div className="py-4">
                                    <Empty description="No albums found"/>
                                </div>
                            ) : (
                                <div className="space-y-4 mt-2">
                                    {band.data.albums.map(album => (
                                        <Card
                                            key={album.id}
                                            size="small"
                                            className="album-card"
                                        >
                                            <div className="flex items-start">
                                                <div className="w-16 h-16 mr-4 flex-shrink-0">
                                                    <ResponsiveImage
                                                        src={album.img}
                                                        alt={album.name}
                                                        className="w-full h-full"
                                                        objectFit="cover"
                                                    />
                                                </div>
                                                <div>
                                                    <div className="font-medium">{album.name}</div>
                                                    <div className="text-gray-500 text-sm">
                                                        {album.release_date ? (
                                                            <span>Released: {new Date(album.release_date).getFullYear()}</span>
                                                        ) : 'No release date'}
                                                    </div>
                                                    <div className="text-gray-500 text-sm">
                                                        {album.songs?.length || 0} tracks
                                                    </div>
                                                    <div className="mt-1">
                                                        {album.genres?.map(genre => (
                                                            <Tag key={`genre-${album.id}-${genre.id}`} color="blue">
                                                                {genre.name}
                                                            </Tag>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    </Col>
                ))}
            </Row>
        </div>
    );
}
