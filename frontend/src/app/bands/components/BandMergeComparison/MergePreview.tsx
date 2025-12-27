'use client'

import {CheckCircleOutlined, WarningOutlined} from '@ant-design/icons';
import {Card, Col, Descriptions, Divider, Empty, Row, Tag, Typography} from 'antd';
import React from 'react';

import LocationDisplay from '@/components/common/data/LocationDisplay';
import ResponsiveImage from '@/components/common/layout/ResponsiveImage';
import WebsiteLink from '@/components/common/navigation/WebsiteLink';
import {getBandImageUrl} from '@/lib/utils/media';
import {StatusTag} from '@/lib/utils/status';
import type {BandWithDiscographyResponse} from '@/types/api/bands';

import type {BandComparisonItem, MergeFieldValue} from './types';

const {Title, Text, Paragraph} = Typography;

interface MergePreviewProps {
    originalBand: BandComparisonItem | null;
    allBands: BandComparisonItem[];
    selectedValues: Record<string, MergeFieldValue>;
    selectedBandIds: number[];
}

export default function MergePreview({originalBand, allBands, selectedValues, selectedBandIds}: MergePreviewProps) {
    if (!originalBand) {
        return <div className="text-center">Original band not found</div>;
    }

    // No bands to merge
    if (selectedBandIds.length === 0) {
        return (
            <Empty
                description={
                    <div>
                        <p>No bands selected for merging.</p>
                        <p>Please add bands to merge or cancel the process.</p>
                    </div>
                }
            />
        );
    }

    // Create a merged band object based on selected values
    const createMergedBand = (): Partial<BandWithDiscographyResponse> => {
        // Start with the original band data as the base
        const mergedBand: Partial<BandWithDiscographyResponse> = {...originalBand.data};

        // Apply all selected values
        Object.entries(selectedValues).forEach(([key, data]) => {
            mergedBand[key as keyof BandWithDiscographyResponse] = data.value;
        });

        return mergedBand;
    };

    // Generate the merged band from selections
    const mergedBand = createMergedBand();

    // Count images and albums that will be merged
    const totalImages = allBands.reduce((sum, band) =>
        sum + (band.data.images?.length || 0), 0);

    const totalAlbums = allBands.reduce((sum, band) =>
        sum + (band.data.albums?.length || 0), 0);

    // Function to check if a value is present
    const hasValue = (value: any): boolean => {
        if (value === undefined || value === null) return false;
        if (typeof value === 'string') return value.trim() !== '';
        return true;
    };

    // Band profile image to display
    const profileImage = originalBand.data.images?.[0] ||
        allBands.find(band => band.data.images?.length)?.data.images?.[0];

    return (
        <div className="space-y-6">
            <Card className="shadow-sm">
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="w-24 h-24 rounded-lg flex-shrink-0 bg-gray-100 overflow-hidden">
                        {profileImage ? (
                            <ResponsiveImage
                                src={getBandImageUrl(profileImage)}
                                alt={mergedBand.name || ''}
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
                            {mergedBand.name}
                        </Title>
                        <div className="flex items-center gap-2">
                            <StatusTag
                                verified={Boolean(mergedBand.verified)}
                                approved={Boolean(mergedBand.approved)}
                            />

                            {mergedBand.country_id && (
                                <Text className="text-gray-500">
                                    <LocationDisplay
                                        countryId={mergedBand.country_id}
                                        stateId={mergedBand.state_id}
                                        cityId={mergedBand.city_id}
                                    />
                                </Text>
                            )}
                        </div>
                    </div>
                </div>
            </Card>

            <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                    <Card title="Basic Information" size="small" className="h-full">
                        <div className="space-y-3">
                            {mergedBand.bio ? (
                                <div>
                                    <Text strong>Biography:</Text>
                                    <div className="mt-1" dangerouslySetInnerHTML={{__html: mergedBand.bio as string}}/>
                                </div>
                            ) : (
                                <div>
                                    <Text strong>Biography:</Text> <Text type="secondary">No biography available</Text>
                                </div>
                            )}
                        </div>
                    </Card>
                </Col>

                <Col xs={24} md={12}>
                    <Card title="Contact Information" size="small" className="h-full">
                        <div className="space-y-3">
                            <div>
                                <Text strong>Website:</Text>{' '}
                                {hasValue(mergedBand.website) ? (
                                    <WebsiteLink href={mergedBand.website as string}/>
                                ) : (
                                    <Text type="secondary">Not specified</Text>
                                )}
                            </div>

                            <div>
                                <Text strong>Email:</Text>{' '}
                                {hasValue(mergedBand.email) ? (
                                    <Text>{mergedBand.email}</Text>
                                ) : (
                                    <Text type="secondary">Not specified</Text>
                                )}
                            </div>

                            <div>
                                <Text strong>Location:</Text>{' '}
                                {mergedBand.country_id ? (
                                    <LocationDisplay
                                        countryId={mergedBand.country_id}
                                        stateId={mergedBand.state_id}
                                        cityId={mergedBand.city_id}
                                    />
                                ) : (
                                    <Text type="secondary">Not specified</Text>
                                )}
                            </div>
                        </div>
                    </Card>
                </Col>

                <Col xs={24}>
                    <Card title="Social Media" size="small">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {[
                                {key: 'facebook_url', label: 'Facebook'},
                                {key: 'twitter', label: 'Twitter'},
                                {key: 'instagram_url', label: 'Instagram'},
                                {key: 'youtube_url', label: 'YouTube'},
                                {key: 'spotify_id', label: 'Spotify'},
                                {key: 'lastfm_url', label: 'Last.fm'},
                            ].map(item => (
                                <div key={item.key}>
                                    <Text strong>{item.label}:</Text>{' '}
                                    {hasValue(mergedBand[item.key as keyof typeof mergedBand]) ? (
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
                        <Descriptions column={{xs: 1, sm: 2}} bordered>
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

                            <Descriptions.Item label="Albums" span={1}>
                                <div className="flex items-center">
                                    <Tag color={totalAlbums > 0 ? 'success' : 'warning'}>
                                        {totalAlbums} albums
                                    </Tag>
                                    {totalAlbums > 0 ? (
                                        <CheckCircleOutlined className="ml-2 text-green-600"/>
                                    ) : (
                                        <WarningOutlined className="ml-2 text-yellow-600"/>
                                    )}
                                </div>
                            </Descriptions.Item>
                        </Descriptions>

                        <Divider className="my-3"/>

                        <div className="text-sm">
                            <p>A total of <strong>{allBands.length - 1}</strong> bands will be merged into the primary
                                band.</p>
                            <p>All albums, songs, and images from all bands will be preserved in the merged band.</p>
                        </div>
                    </Card>
                </Col>

                <Col xs={24}>
                    <Card title="Merge Summary" size="small" className="bg-blue-50">
                        <ul className="list-disc pl-5 space-y-2">
                            <li><Text strong>{originalBand.name}</Text> will be kept as the primary band.</li>
                            <li>
                                {selectedBandIds.length === 1 ? 'One band' : `${selectedBandIds.length} bands`} will be
                                merged into {originalBand.name}.
                            </li>
                            <li>All albums and songs from all bands will be preserved.</li>
                            <li>All images from all bands will be preserved.</li>
                            <li>Field values have been selected based on your choices.</li>
                        </ul>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}
