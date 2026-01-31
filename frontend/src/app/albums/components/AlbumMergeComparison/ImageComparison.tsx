'use client'

import {Col, Empty, Row, Spin, Typography} from 'antd';
import React from 'react';

import ResponsiveImage from '@/components/common/layout/ResponsiveImage';
import {buildImageUrl} from '@/lib/utils/media';

import type {AlbumComparisonItem} from './types';

const {Text} = Typography;

interface ImageComparisonProps {
    allAlbums: AlbumComparisonItem[];
    primaryAlbumId: number;
}

export default function ImageComparison({allAlbums, primaryAlbumId}: ImageComparisonProps) {
    // Calculate column span based on number of albums
    const albumCount = allAlbums.length;
    const colSpan = Math.floor(24 / albumCount);

    return (
        <div className="mb-6">
            <Text strong className="block mb-4">Album Images</Text>
            <div className="text-sm text-gray-500 mb-4">
                All images from all albums will be preserved in the merged album.
            </div>

            <Row gutter={[24, 16]}>
                {allAlbums.map(album => (
                    <Col key={album.id} span={colSpan}>
                        <div className={`p-3 rounded-lg ${album.id === primaryAlbumId ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
                            <Text strong className={`block mb-3 ${album.id === primaryAlbumId ? 'text-blue-600' : ''}`}>
                                {album.name}
                                {album.id === primaryAlbumId && <span className="text-xs ml-1">(Primary)</span>}
                            </Text>
                            {album.loading ? (
                                <div className="py-8 text-center"><Spin/></div>
                            ) : !album.data.images || album.data.images.length === 0 ? (
                                <Empty description="No images" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                            ) : (
                                <div className="grid grid-cols-2 gap-2">
                                    {album.data.images.map(image => {
                                        const imageUrl = buildImageUrl(image.path, image.filename);

                                        return (
                                            <div key={image.id} className="image-card">
                                                <div className="aspect-square bg-gray-100 relative overflow-hidden rounded">
                                                    <ResponsiveImage
                                                        src={imageUrl}
                                                        alt={`${album.name} photo`}
                                                        className="w-full h-full"
                                                        objectFit="cover"
                                                    />
                                                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 truncate">
                                                        {image.filename || 'Unknown'}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            <div className="text-xs text-gray-500 mt-2">
                                {album.data.images?.length || 0} image(s)
                            </div>
                        </div>
                    </Col>
                ))}
            </Row>
        </div>
    );
}
