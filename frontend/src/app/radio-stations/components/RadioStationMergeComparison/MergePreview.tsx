'use client'

import {Card, Col, Descriptions, Empty, Row, Spin, Table, Tag, Typography} from 'antd';
import React from 'react';

import DOMPurify from 'dompurify';
import type {RadioStationResponse, RadioStationMergePreviewResponse, RadioStationRelatedCounts} from '@/types/api/radio-stations';

import type {RadioStationComparisonItem, MergeFieldValue} from './types';

const {Title, Text} = Typography;

interface MergePreviewProps {
    originalStation: RadioStationComparisonItem | null;
    allStations: RadioStationComparisonItem[];
    selectedValues: Record<string, MergeFieldValue>;
    selectedStationIds: number[];
    previewData: RadioStationMergePreviewResponse | null;
}

const CATEGORY_LABELS: { key: keyof RadioStationRelatedCounts; label: string }[] = [
    {key: 'addresses', label: 'Addresses'},
    {key: 'affiliates', label: 'Affiliates'},
    {key: 'emails', label: 'Emails'},
    {key: 'images', label: 'Images'},
    {key: 'links', label: 'Links'},
    {key: 'phone_numbers', label: 'Phone Numbers'},
    {key: 'internet_details', label: 'Internet Details'},
    {key: 'satellite_details', label: 'Satellite Details'},
    {key: 'syndicated_details', label: 'Syndicated Details'},
    {key: 'terrestrial_details', label: 'Terrestrial Details'},
    {key: 'staff_members', label: 'Staff Members'},
    {key: 'sub_genres', label: 'Sub-Genres'},
    {key: 'users', label: 'Users'},
    {key: 'playlists', label: 'Playlists'},
    {key: 'playlist_archives', label: 'Playlist Archives'},
    {key: 'raw_data', label: 'Raw Data'},
    {key: 'song_aliases', label: 'Song Aliases'},
    {key: 'album_aliases', label: 'Album Aliases'},
    {key: 'station_aliases', label: 'Station Aliases'},
    {key: 'duplicate_candidates', label: 'Duplicate Candidates'},
];

export default function MergePreview({originalStation, allStations, selectedValues, selectedStationIds, previewData}: MergePreviewProps) {
    if (!originalStation) {
        return <div className="text-center">Original radio station not found</div>;
    }

    if (selectedStationIds.length === 0) {
        return (
            <Empty
                description={
                    <div>
                        <p>No radio stations selected for merging.</p>
                        <p>Please add radio stations to merge or cancel the process.</p>
                    </div>
                }
            />
        );
    }

    const createMergedStation = (): Partial<RadioStationResponse> => {
        const mergedStation: Partial<RadioStationResponse> = {...originalStation.data};
        Object.entries(selectedValues).forEach(([key, data]) => {
            (mergedStation as any)[key] = data.value;
        });
        return mergedStation;
    };

    const mergedStation = createMergedStation();

    const hasValue = (value: any): boolean => {
        if (value === undefined || value === null) return false;
        if (typeof value === 'string') return value.trim() !== '';
        return true;
    };

    // Build table data for related counts
    const buildRelatedDataTable = () => {
        if (!previewData) {
            return <Spin tip="Loading related data counts..." />;
        }

        const columns = [
            {
                title: 'Category',
                dataIndex: 'category',
                key: 'category',
                width: 180,
            },
            ...previewData.stations.map(station => ({
                title: (
                    <span className={station.station_id === originalStation.id ? 'text-blue-600 font-medium' : ''}>
                        {station.station_name}
                        {station.station_id === originalStation.id && ' (Primary)'}
                    </span>
                ),
                dataIndex: `station_${station.station_id}`,
                key: `station_${station.station_id}`,
                width: 120,
                align: 'center' as const,
            })),
            {
                title: <span className="font-semibold">Total</span>,
                dataIndex: 'total',
                key: 'total',
                width: 100,
                align: 'center' as const,
                render: (val: number) => <span className="font-semibold">{val}</span>,
            },
        ];

        const dataSource = CATEGORY_LABELS.map(({key, label}) => {
            const row: Record<string, any> = {
                key,
                category: label,
                total: previewData.totals[key],
            };
            for (const station of previewData.stations) {
                const count = station.counts[key];
                row[`station_${station.station_id}`] = count;
            }
            return row;
        });

        const totalRecords = Object.values(previewData.totals).reduce((sum, val) => sum + val, 0);

        return (
            <>
                <Table
                    dataSource={dataSource}
                    columns={columns}
                    pagination={false}
                    size="small"
                    bordered
                    rowClassName={(record) => record.total === 0 ? 'text-gray-400' : ''}
                />
                <div className="mt-3 text-sm">
                    Merging <strong>{previewData.stations.length}</strong> stations will consolidate <strong>{totalRecords}</strong> total related records.
                </div>
            </>
        );
    };

    return (
        <div className="space-y-6">
            <Card className="shadow-sm">
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                        <Title level={3} className="!mb-1" style={{wordBreak: 'break-word'}}>
                            {mergedStation.name}
                        </Title>
                        <div className="flex items-center gap-2 flex-wrap">
                            {mergedStation.station_type && (
                                <Tag color={mergedStation.station_type === 'terrestrial' ? 'blue' : 'green'}>
                                    {mergedStation.station_type === 'terrestrial' ? 'Terrestrial' : 'Internet'}
                                </Tag>
                            )}
                            {mergedStation.approved && <Tag color="success">Approved</Tag>}
                            {mergedStation.verified && <Tag color="processing">Verified</Tag>}
                            {mergedStation.active ? (
                                <Tag color="success">Active</Tag>
                            ) : (
                                <Tag color="default">Inactive</Tag>
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
                                <Text strong>Name:</Text>{' '}
                                {hasValue(mergedStation.name) ? (
                                    <Text>{mergedStation.name}</Text>
                                ) : (
                                    <Text type="secondary">Not specified</Text>
                                )}
                            </div>
                            <div>
                                <Text strong>Slug:</Text>{' '}
                                {hasValue(mergedStation.slug) ? (
                                    <Text code>{mergedStation.slug}</Text>
                                ) : (
                                    <Text type="secondary">Not specified</Text>
                                )}
                            </div>
                            <div>
                                <Text strong>Type:</Text>{' '}
                                {hasValue(mergedStation.station_type) ? (
                                    <Tag color={mergedStation.station_type === 'terrestrial' ? 'blue' : 'green'}>
                                        {mergedStation.station_type === 'terrestrial' ? 'Terrestrial' : 'Internet'}
                                    </Tag>
                                ) : (
                                    <Text type="secondary">Not specified</Text>
                                )}
                            </div>
                            {mergedStation.info ? (
                                <div>
                                    <Text strong>Info:</Text>
                                    <div className="mt-1" dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(mergedStation.info as string)}}/>
                                </div>
                            ) : (
                                <div>
                                    <Text strong>Info:</Text> <Text type="secondary">No info available</Text>
                                </div>
                            )}
                        </div>
                    </Card>
                </Col>

                <Col xs={24} md={12}>
                    <Card title="Status Flags" size="small" className="h-full">
                        <Descriptions column={1} bordered size="small">
                            <Descriptions.Item label="Approved">
                                <Tag color={mergedStation.approved ? 'success' : 'default'}>
                                    {mergedStation.approved ? 'Yes' : 'No'}
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Verified">
                                <Tag color={mergedStation.verified ? 'success' : 'default'}>
                                    {mergedStation.verified ? 'Yes' : 'No'}
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Automatic">
                                <Tag color={mergedStation.automatic ? 'success' : 'default'}>
                                    {mergedStation.automatic ? 'Yes' : 'No'}
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Active">
                                <Tag color={mergedStation.active ? 'success' : 'default'}>
                                    {mergedStation.active ? 'Yes' : 'No'}
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="No Show">
                                <Tag color={mergedStation.no_show ? 'warning' : 'default'}>
                                    {mergedStation.no_show ? 'Yes' : 'No'}
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Influence">
                                <Text>{mergedStation.influence ?? 0}</Text>
                            </Descriptions.Item>
                        </Descriptions>
                    </Card>
                </Col>

                <Col xs={24}>
                    <Card title="Related Data Breakdown" size="small">
                        {buildRelatedDataTable()}
                    </Card>
                </Col>

                <Col xs={24}>
                    <Card title="Merge Summary" size="small" className="bg-blue-50">
                        <ul className="list-disc pl-5 space-y-2">
                            <li><Text strong>{originalStation.name}</Text> will be kept as the primary radio station.</li>
                            <li>
                                {selectedStationIds.length === 1 ? 'One station' : `${selectedStationIds.length} stations`} will be
                                merged into {originalStation.name}.
                            </li>
                            <li>All staff members, contacts, playlists, and affiliates from all stations will be reassigned.</li>
                            <li>All images and links from all stations will be preserved.</li>
                            <li>Field values have been selected based on your choices.</li>
                        </ul>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}
