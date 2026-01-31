'use client'

import {Card, Col, Empty, Row, Spin, Tag, Typography} from 'antd';
import React from 'react';

import ResponsiveImage from '@/components/common/layout/ResponsiveImage';
import {getAlbumDisplayImageUrl} from '@/lib/utils/media';

import type {BandComparisonItem} from './types';

const {Text} = Typography;

interface DiscographyComparisonProps {
    allBands: BandComparisonItem[];
    primaryBandId: number;
}

export default function DiscographyComparison({allBands, primaryBandId}: DiscographyComparisonProps) {
    // Calculate column span based on number of bands
    const bandCount = allBands.length;
    const colSpan = Math.floor(24 / bandCount);

    return (
        <div className="mb-6">
            <Text strong className="block mb-4">Albums</Text>
            <div className="text-sm text-gray-500 mb-4">
                All albums from all bands will be preserved in the merged band.
            </div>

            <Row gutter={[24, 16]}>
                {allBands.map(band => (
                    <Col key={band.id} span={colSpan}>
                        <div className={`p-3 rounded-lg ${band.id === primaryBandId ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
                            <Text strong className={`block mb-3 ${band.id === primaryBandId ? 'text-blue-600' : ''}`}>
                                {band.name}
                                {band.id === primaryBandId && <span className="text-xs ml-1">(Primary)</span>}
                            </Text>
                            {band.loading ? (
                                <div className="py-8 text-center"><Spin/></div>
                            ) : !band.data.albums || band.data.albums.length === 0 ? (
                                <Empty description="No albums" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                            ) : (
                                <div className="space-y-3">
                                    {band.data.albums.map(album => (
                                        <Card
                                            key={album.id}
                                            size="small"
                                            className="album-card"
                                        >
                                            <div className="flex items-start">
                                                <div className="w-12 h-12 mr-3 flex-shrink-0">
                                                    <ResponsiveImage
                                                        src={getAlbumDisplayImageUrl(album)}
                                                        alt={album.name}
                                                        className="w-full h-full rounded"
                                                        objectFit="cover"
                                                    />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="font-medium text-sm truncate">{album.name}</div>
                                                    <div className="text-gray-500 text-xs">
                                                        {album.release_date ? (
                                                            <span>{new Date(album.release_date).getFullYear()}</span>
                                                        ) : 'No date'}
                                                        {' · '}
                                                        {album.songs?.length || 0} tracks
                                                    </div>
                                                    {album.genres && album.genres.length > 0 && (
                                                        <div className="mt-1 flex flex-wrap gap-1">
                                                            {album.genres.slice(0, 2).map(genre => (
                                                                <Tag key={`genre-${album.id}-${genre.id}`} color="blue" className="text-xs">
                                                                    {genre.name}
                                                                </Tag>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            )}
                            <div className="text-xs text-gray-500 mt-2">
                                {band.data.albums?.length || 0} album(s)
                            </div>
                        </div>
                    </Col>
                ))}
            </Row>
        </div>
    );
}
