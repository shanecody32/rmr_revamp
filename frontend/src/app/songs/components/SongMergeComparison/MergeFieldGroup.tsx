'use client'

import {Col, Radio, Row, Spin, Typography} from 'antd';
import React from 'react';

import type {SongResponse} from '@/types/api/songs';

import type {SongComparisonItem, FieldGroup, MergeFieldValue} from './types';

const {Text} = Typography;

interface MergeFieldGroupProps {
    fieldGroup: FieldGroup;
    allSongs: SongComparisonItem[];
    primarySongId: number;
    selectedValues: Record<string, MergeFieldValue>;
    onSelectValue: (fieldKey: string, value: any, sourceId: number) => void;
}

export default function MergeFieldGroup({
                                            fieldGroup,
                                            allSongs,
                                            primarySongId,
                                            selectedValues,
                                            onSelectValue,
                                        }: MergeFieldGroupProps) {
    // Calculate column span based on number of songs (minimum 2 columns for field label + songs)
    const songCount = allSongs.length;
    // Label column takes 4, remaining 20 split among songs
    const songColSpan = Math.floor(20 / songCount);

    const handleSelectValue = (fieldKey: string, songId: number) => {
        const selectedSong = allSongs.find(song => song.id === songId);
        if (selectedSong) {
            onSelectValue(fieldKey, selectedSong.data[fieldKey as keyof SongResponse], songId);
        }
    };

    const getDisplayValue = (song: SongComparisonItem, fieldKey: string) => {
        if (song.loading) {
            return <Spin size="small" />;
        }

        const value = song.data[fieldKey as keyof SongResponse];
        if (typeof value === 'boolean') {
            return value ? 'Yes' : 'No';
        }
        if (fieldKey === 'lyrics' && typeof value === 'string' && value.length > 100) {
            return <span title={value}>{value.substring(0, 100)}...</span>;
        }
        if (typeof value === 'object' && value !== null) {
            return JSON.stringify(value);
        }
        return value || <span className="text-gray-400">&mdash;</span>;
    };

    const getSelectedSourceId = (fieldKey: string) => {
        return selectedValues[fieldKey]?.sourceId ?? null;
    };

    return (
        <div className="merge-field-group">
            {/* Header row with song names */}
            <Row gutter={[16, 0]} className="mb-4 pb-2 border-b border-gray-200">
                <Col span={4}>
                    <Text strong className="text-gray-500">Field</Text>
                </Col>
                {allSongs.map(song => (
                    <Col key={song.id} span={songColSpan}>
                        <Text strong className={song.id === primarySongId ? 'text-blue-600' : ''}>
                            {song.name}
                            {song.id === primarySongId && <span className="text-xs ml-1">(Primary)</span>}
                        </Text>
                    </Col>
                ))}
            </Row>

            {/* Field rows */}
            {fieldGroup.fields.map(field => {
                const selectedSourceId = getSelectedSourceId(field.key);

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

                        {/* Song values as columns */}
                        {allSongs.map(song => (
                            <Col key={song.id} span={songColSpan}>
                                <Radio
                                    checked={selectedSourceId === song.id}
                                    onChange={() => handleSelectValue(field.key, song.id)}
                                    disabled={song.loading}
                                    className="w-full"
                                >
                                    <div className={`pl-1 ${selectedSourceId === song.id ? 'font-medium' : ''}`}>
                                        {getDisplayValue(song, field.key)}
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
