'use client'

import {Card, Col, Empty, Row, Spin, Table, Tag, Typography} from 'antd';
import React from 'react';

import DOMPurify from 'dompurify';
import ResponsiveImage from '@/components/common/layout/ResponsiveImage';
import {getStaffImageUrl} from '@/lib/utils/media';
import type {StaffDetailView, StaffMergePreviewResponse, StaffRelatedCounts} from '@/types/api/staff';
import {getStaffDisplayName} from '@/types/api/staff';

import type {MergeFieldValue, StaffComparisonItem} from './types';

const {Title, Text} = Typography;

interface StaffMergePreviewProps {
    originalStaff: StaffComparisonItem | null;
    allStaff: StaffComparisonItem[];
    selectedValues: Record<string, MergeFieldValue>;
    selectedStaffIds: number[];
    previewData: StaffMergePreviewResponse | null;
}

const CATEGORY_LABELS: { key: keyof StaffRelatedCounts; label: string }[] = [
    {key: 'images', label: 'Images'},
    {key: 'links', label: 'Links'},
    {key: 'phones', label: 'Phones'},
    {key: 'addresses', label: 'Addresses'},
    {key: 'aliases', label: 'Aliases'},
    {key: 'playlists', label: 'Playlists'},
    {key: 'playlist_archives', label: 'Playlist Archives'},
    {key: 'sub_genres', label: 'Sub-Genres'},
    {key: 'duplicate_candidates', label: 'Duplicate Candidates'},
];

export default function StaffMergePreview({
                                              originalStaff,
                                              allStaff,
                                              selectedValues,
                                              selectedStaffIds,
                                              previewData,
                                          }: StaffMergePreviewProps) {
    if (!originalStaff) {
        return <div className="text-center">Original staff member not found</div>;
    }

    if (selectedStaffIds.length === 0) {
        return (
            <Empty
                description={
                    <div>
                        <p>No staff members selected for merging.</p>
                        <p>Please add staff members to merge or cancel the process.</p>
                    </div>
                }
            />
        );
    }

    const createMergedStaff = (): Partial<StaffDetailView> => {
        const merged: Partial<StaffDetailView> = {...originalStaff.data};
        Object.entries(selectedValues).forEach(([key, data]) => {
            (merged as any)[key] = data.value;
        });
        return merged;
    };

    const mergedStaff = createMergedStaff();

    const hasValue = (value: any): boolean => {
        if (value === undefined || value === null) return false;
        if (typeof value === 'string') return value.trim() !== '';
        return true;
    };

    const mergedName = getStaffDisplayName(mergedStaff as any);

    const profileImage = originalStaff.data.images?.[0] ||
        allStaff.find(s => s.data.images?.length)?.data.images?.[0];

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
            ...previewData.staff.map(member => ({
                title: (
                    <span className={member.staff_id === originalStaff.id ? 'text-blue-600 font-medium' : ''}>
                        {member.staff_name}
                        {member.staff_id === originalStaff.id && ' (Primary)'}
                    </span>
                ),
                dataIndex: `staff_${member.staff_id}`,
                key: `staff_${member.staff_id}`,
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
            for (const member of previewData.staff) {
                row[`staff_${member.staff_id}`] = member.counts[key];
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
                    Merging <strong>{previewData.staff.length}</strong> staff members will consolidate <strong>{totalRecords}</strong> total related records.
                </div>
            </>
        );
    };

    return (
        <div className="space-y-6">
            {/* Profile Card */}
            <Card className="shadow-sm">
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="w-24 h-24 rounded-lg flex-shrink-0 bg-gray-100 overflow-hidden">
                        {profileImage ? (
                            <ResponsiveImage
                                src={getStaffImageUrl(profileImage)}
                                alt={mergedName}
                                className="w-full h-full"
                                objectFit="cover"
                            />
                        ) : (
                            <div
                                className="w-full h-full flex items-center justify-center text-gray-400">
                                No Image
                            </div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <Title level={3} className="!mb-1" style={{wordBreak: 'break-word'}}>
                            {mergedName}
                        </Title>
                    </div>
                </div>
            </Card>

            <Row gutter={[16, 16]}>
                {/* Basic Info */}
                <Col xs={24} md={12}>
                    <Card title="Basic Information" size="small" className="h-full">
                        <div className="space-y-3">
                            <div>
                                <Text strong>First Name:</Text>{' '}
                                {hasValue(mergedStaff.first_name) ? (
                                    <Text>{mergedStaff.first_name}</Text>
                                ) : (
                                    <Text type="secondary">Not specified</Text>
                                )}
                            </div>
                            <div>
                                <Text strong>Last Name:</Text>{' '}
                                {hasValue(mergedStaff.last_name) ? (
                                    <Text>{mergedStaff.last_name}</Text>
                                ) : (
                                    <Text type="secondary">Not specified</Text>
                                )}
                            </div>
                            <div>
                                <Text strong>On-Air Name:</Text>{' '}
                                {hasValue(mergedStaff.on_air_name) ? (
                                    <Text>{mergedStaff.on_air_name}</Text>
                                ) : (
                                    <Text type="secondary">Not specified</Text>
                                )}
                            </div>
                        </div>
                    </Card>
                </Col>

                {/* Contact & Show */}
                <Col xs={24} md={12}>
                    <Card title="Contact & Show" size="small" className="h-full">
                        <div className="space-y-3">
                            <div>
                                <Text strong>Email:</Text>{' '}
                                {hasValue(mergedStaff.email) ? (
                                    <Text>{mergedStaff.email}</Text>
                                ) : (
                                    <Text type="secondary">Not specified</Text>
                                )}
                            </div>
                            <div>
                                <Text strong>Position:</Text>{' '}
                                {hasValue(mergedStaff.position) ? (
                                    <Text>{mergedStaff.position}</Text>
                                ) : (
                                    <Text type="secondary">Not specified</Text>
                                )}
                            </div>
                            <div>
                                <Text strong>Show Name:</Text>{' '}
                                {hasValue(mergedStaff.show_name) ? (
                                    <Text>{mergedStaff.show_name}</Text>
                                ) : (
                                    <Text type="secondary">Not specified</Text>
                                )}
                            </div>
                            {mergedStaff.bio ? (
                                <div>
                                    <Text strong>Biography:</Text>
                                    <div className="mt-1"
                                         dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(mergedStaff.bio as string)}}/>
                                </div>
                            ) : (
                                <div>
                                    <Text strong>Biography:</Text>{' '}
                                    <Text type="secondary">No biography available</Text>
                                </div>
                            )}
                        </div>
                    </Card>
                </Col>

                {/* Related Data Breakdown */}
                <Col xs={24}>
                    <Card title="Related Data Breakdown" size="small">
                        {buildRelatedDataTable()}
                    </Card>
                </Col>

                {/* Merge Summary */}
                <Col xs={24}>
                    <Card title="Merge Summary" size="small" className="bg-blue-50">
                        <ul className="list-disc pl-5 space-y-2">
                            <li><Text strong>{originalStaff.name}</Text> will be kept as the primary staff member.</li>
                            <li>
                                {selectedStaffIds.length === 1 ? 'One staff member' : `${selectedStaffIds.length} staff members`} will
                                be merged into {originalStaff.name}.
                            </li>
                            <li>All images, links, and contact info from all staff members will be preserved.</li>
                            <li>Field values have been selected based on your choices.</li>
                        </ul>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}
