'use client'

import {Col, Empty, Row, Spin, Typography} from 'antd';
import React from 'react';

import ResponsiveImage from '@/components/common/layout/ResponsiveImage';
import {getBandImageUrl} from '@/lib/utils/media';

import type {BandComparisonItem} from './types';

const {Text} = Typography;

interface ImageComparisonProps {
    allBands: BandComparisonItem[];
    primaryBandId: number;
}

export default function ImageComparison({allBands, primaryBandId}: ImageComparisonProps) {
    // Calculate column span based on number of bands
    const bandCount = allBands.length;
    const colSpan = Math.floor(24 / bandCount);

    return (
        <div className="mb-6">
            <Text strong className="block mb-4">Band Photos</Text>
            <div className="text-sm text-gray-500 mb-4">
                All images from all bands will be preserved in the merged band.
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
                            ) : !band.data.images || band.data.images.length === 0 ? (
                                <Empty description="No images" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                            ) : (
                                <div className="grid grid-cols-2 gap-2">
                                    {band.data.images.map(image => {
                                        const imageUrl = getBandImageUrl(image);

                                        return (
                                            <div key={image.id} className="image-card">
                                                <div className="aspect-square bg-gray-100 relative overflow-hidden rounded">
                                                    <ResponsiveImage
                                                        src={imageUrl}
                                                        alt={`${band.name} photo`}
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
                                {band.data.images?.length || 0} image(s)
                            </div>
                        </div>
                    </Col>
                ))}
            </Row>
        </div>
    );
}
