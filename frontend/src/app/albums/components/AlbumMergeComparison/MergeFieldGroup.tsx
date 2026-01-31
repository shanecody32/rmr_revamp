'use client'

import {Col, Radio, Row, Spin, Typography} from 'antd';
import React from 'react';

import type {AlbumWithRelationsResponse} from '@/types/api/albums';

import type {AlbumComparisonItem, FieldGroup, MergeFieldValue} from './types';

const {Text} = Typography;

interface MergeFieldGroupProps {
    fieldGroup: FieldGroup;
    allAlbums: AlbumComparisonItem[];
    primaryAlbumId: number;
    selectedValues: Record<string, MergeFieldValue>;
    onSelectValue: (fieldKey: string, value: any, sourceId: number) => void;
    renderSpecialField?: (field: string, album: AlbumComparisonItem) => React.ReactNode;
}

export default function MergeFieldGroup({
                                            fieldGroup,
                                            allAlbums,
                                            primaryAlbumId,
                                            selectedValues,
                                            onSelectValue,
                                            renderSpecialField
                                        }: MergeFieldGroupProps) {
    // Calculate column span based on number of albums (minimum 2 columns for field label + albums)
    const albumCount = allAlbums.length;
    // Label column takes 4, remaining 20 split among albums
    const albumColSpan = Math.floor(20 / albumCount);

    const handleSelectValue = (fieldKey: string, albumId: number) => {
        const selectedAlbum = allAlbums.find(album => album.id === albumId);
        if (selectedAlbum) {
            onSelectValue(fieldKey, selectedAlbum.data[fieldKey as keyof AlbumWithRelationsResponse], albumId);
        }
    };

    const getDisplayValue = (album: AlbumComparisonItem, fieldKey: string) => {
        if (album.loading) {
            return <Spin size="small" />;
        }

        if (renderSpecialField) {
            const specialResult = renderSpecialField(fieldKey, album);
            if (specialResult) return specialResult;
        }

        const value = album.data[fieldKey as keyof AlbumWithRelationsResponse];
        if (typeof value === 'boolean') {
            return value ? 'Yes' : 'No';
        }
        if (typeof value === 'object' && value !== null) {
            return JSON.stringify(value);
        }
        return value || <span className="text-gray-400">&mdash;</span>;
    };

    const getSelectedSourceId = (field: { key: string; special?: string }) => {
        return selectedValues[field.key]?.sourceId ?? null;
    };

    return (
        <div className="merge-field-group">
            {/* Header row with album names */}
            <Row gutter={[16, 0]} className="mb-4 pb-2 border-b border-gray-200">
                <Col span={4}>
                    <Text strong className="text-gray-500">Field</Text>
                </Col>
                {allAlbums.map(album => (
                    <Col key={album.id} span={albumColSpan}>
                        <Text strong className={album.id === primaryAlbumId ? 'text-blue-600' : ''}>
                            {album.name}
                            {album.id === primaryAlbumId && <span className="text-xs ml-1">(Primary)</span>}
                        </Text>
                    </Col>
                ))}
            </Row>

            {/* Field rows */}
            {fieldGroup.fields.map(field => {
                const selectedSourceId = getSelectedSourceId(field);

                return (
                    <Row
                        key={field.key}
                        gutter={[16, 0]}
                        className="py-3 border-b border-gray-100 hover:bg-gray-50 items-start"
                    >
                        {/* Field label */}
                        <Col span={4}>
                            <Text strong className="text-gray-700">{field.label}</Text>
                        </Col>

                        {/* Album values as columns */}
                        {allAlbums.map(album => (
                            <Col key={album.id} span={albumColSpan}>
                                <Radio
                                    checked={selectedSourceId === album.id}
                                    onChange={() => handleSelectValue(field.key, album.id)}
                                    disabled={album.loading}
                                    className="w-full"
                                >
                                    <div className={`pl-1 ${selectedSourceId === album.id ? 'font-medium' : ''}`}>
                                        {getDisplayValue(album, field.key)}
                                    </div>
                                </Radio>
                            </Col>
                        ))}
                    </Row>
                );
            })}
        </div>
    );
}
