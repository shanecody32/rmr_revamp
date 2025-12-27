'use client'

import {Col, Empty, Row, Spin, Typography} from 'antd';
import React from 'react';

import ResponsiveImage from '@/components/common/layout/ResponsiveImage';
import {getBandImageUrl} from '@/lib/utils/media';

import type {BandComparisonItem} from './types';

const {Text} = Typography;

interface ImageComparisonProps {
    allBands: BandComparisonItem[];
    originalBandId: number;
}

export default function ImageComparison({allBands, originalBandId}: ImageComparisonProps) {
    return (
        <div className="mb-6">
            <Text strong className="block mb-4">Band Photos</Text>
            <div className="text-sm mb-4">
                All images from all bands will be preserved in the merged band.
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
                            ) : !band.data.images || band.data.images.length === 0 ? (
                                <div className="py-4">
                                    <Empty description="No images found"/>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-2">
                                    {band.data.images.map(image => {
                                        const imageUrl = getBandImageUrl(image);

                                        return (
                                            <div key={image.id} className="image-card">
                                                <div
                                                    className="aspect-square bg-gray-100 relative overflow-hidden rounded">
                                                    <ResponsiveImage
                                                        src={imageUrl}
                                                        alt={`${band.name} photo`}
                                                        className="w-full h-full"
                                                        objectFit="cover"
                                                    />
                                                    <div
                                                        className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 truncate">
                                                        {image.filename || 'Unknown'}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </Col>
                ))}
            </Row>
        </div>
    );
}
