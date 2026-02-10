'use client'

import {Col, Empty, Row, Spin, Typography} from 'antd';
import React from 'react';

import ResponsiveImage from '@/components/common/layout/ResponsiveImage';
import {getStaffImageUrl} from '@/lib/utils/media';

import type {StaffComparisonItem} from './types';

const {Text} = Typography;

interface StaffImageComparisonProps {
    allStaff: StaffComparisonItem[];
    primaryStaffId: number;
}

export default function StaffImageComparison({allStaff, primaryStaffId}: StaffImageComparisonProps) {
    const staffCount = allStaff.length;
    const colSpan = Math.floor(24 / staffCount);

    return (
        <div className="mb-6">
            <Text strong className="block mb-4">Staff Photos</Text>
            <div className="text-sm text-gray-500 mb-4">
                All images from all staff members will be preserved in the merged profile.
            </div>

            <Row gutter={[24, 16]}>
                {allStaff.map(staff => (
                    <Col key={staff.id} span={colSpan}>
                        <div
                            className={`p-3 rounded-lg ${staff.id === primaryStaffId ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
                            <Text strong
                                  className={`block mb-3 ${staff.id === primaryStaffId ? 'text-blue-600' : ''}`}>
                                {staff.name}
                                {staff.id === primaryStaffId && <span className="text-xs ml-1">(Primary)</span>}
                            </Text>
                            {staff.loading ? (
                                <div className="py-8 text-center"><Spin/></div>
                            ) : !staff.data.images || staff.data.images.length === 0 ? (
                                <Empty description="No images" image={Empty.PRESENTED_IMAGE_SIMPLE}/>
                            ) : (
                                <div className="grid grid-cols-2 gap-2">
                                    {staff.data.images.map(image => {
                                        const imageUrl = getStaffImageUrl(image);

                                        return (
                                            <div key={image.id} className="image-card">
                                                <div
                                                    className="aspect-square bg-gray-100 relative overflow-hidden rounded">
                                                    <ResponsiveImage
                                                        src={imageUrl}
                                                        alt={`${staff.name} photo`}
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
                            <div className="text-xs text-gray-500 mt-2">
                                {staff.data.images?.length || 0} image(s)
                            </div>
                        </div>
                    </Col>
                ))}
            </Row>
        </div>
    );
}
