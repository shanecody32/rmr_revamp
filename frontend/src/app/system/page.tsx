'use client'

import React, { useState } from 'react';
import { Card, Button, Progress, Typography, Space, Alert, Tag, Divider } from 'antd';
import { PlayCircleOutlined, CheckCircleOutlined, SyncOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { PageHeader } from '@/components/layout';
import { systemApi } from '@/lib/api/system';
import type { EntityJobState } from '@/types/api/system';
import { useJobs } from '@/contexts/JobContext';

const { Title, Text } = Typography;

export default function SystemPage() {
    const { 
        backfillProgress: progress, 
        genreUpdateProgress: genreProgress, 
        refreshProgress 
    } = useJobs();
    
    const [loading, setLoading] = useState(false);
    const [genreLoading, setGenreLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleTriggerBackfill = async () => {
        setLoading(true);
        setError(null);
        try {
            await systemApi.triggerBackfill();
            await refreshProgress();
        } catch (err: any) {
            console.error('Failed to trigger backfill:', err);
            setError(err.response?.data || 'Failed to start backfill');
        } finally {
            setLoading(false);
        }
    };

    const handleTriggerGenreUpdate = async () => {
        setGenreLoading(true);
        setError(null);
        try {
            await systemApi.triggerAlbumGenreUpdate();
            await refreshProgress();
        } catch (err: any) {
            console.error('Failed to trigger genre update:', err);
            setError(err.response?.data || 'Failed to start genre update');
        } finally {
            setGenreLoading(false);
        }
    };

    const renderEntityStatus = (item: EntityJobState) => {
        if (item.completed) {
            return <Tag color="success" icon={<CheckCircleOutlined />}>Completed</Tag>;
        }
        if (progress?.is_running && progress.current_entity === item.entity) {
            return <Tag color="processing" icon={<SyncOutlined spin />}>Processing</Tag>;
        }
        if (item.error) {
            return <Tag color="error" icon={<ExclamationCircleOutlined />}>Error</Tag>;
        }
        return <Tag color="default">Pending</Tag>;
    };

    return (
        <>
            <PageHeader title="System Settings" />
            <Space orientation="vertical" size="large" style={{ width: '100%' }}>
                <Card title="Similarity Data Backfill" extra={
                    <Button 
                        type="primary" 
                        icon={<PlayCircleOutlined />} 
                        onClick={handleTriggerBackfill} 
                        loading={progress?.is_running || loading}
                        disabled={progress?.is_running}
                    >
                        {progress?.is_running ? 'Backfill in Progress...' : 'Start Backfill'}
                    </Button>
                }>
                    <Text>
                        This process will re-generate similarity keys (Soundex, Metaphone, etc.) for all existing records in the database. 
                        This is necessary after updating the similarity algorithm or adding new phonetic columns.
                    </Text>
                    
                    {error && (
                        <Alert 
                            message="Error" 
                            description={error} 
                            type="error" 
                            showIcon 
                            style={{ marginTop: 16 }} 
                            closable 
                            onClose={() => setError(null)}
                        />
                    )}

                    {progress && (
                        <div style={{ marginTop: 24 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <Title level={5}>Overall Progress</Title>
                                <Text strong>{progress.overall_progress.toFixed(1)}%</Text>
                            </div>
                            <Progress 
                                percent={parseFloat(progress.overall_progress.toFixed(1))} 
                                status={progress.is_running ? 'active' : (progress.overall_progress === 100 ? 'success' : 'normal')}
                                strokeColor={progress.last_error ? '#ff4d4f' : undefined}
                            />
                            
                            {progress.current_entity && progress.is_running && (
                                <div style={{ marginTop: 8 }}>
                                    <Text type="secondary">Current Entity: </Text>
                                    <Text strong>{progress.current_entity}</Text>
                                </div>
                            )}

                            {progress.last_error && (
                                <Alert 
                                    message="Last Error" 
                                    description={progress.last_error} 
                                    type="warning" 
                                    showIcon 
                                    style={{ marginTop: 16 }}
                                />
                            )}

                            <Divider>Entity Breakdown</Divider>
                            
                            <div className="mt-4 space-y-4">
                                {progress.entities.map((item) => (
                                    <div key={item.entity} className="flex justify-between items-start py-3 border-b border-gray-100 last:border-0">
                                        <div className="flex-1 pr-4">
                                            <div className="font-medium mb-1">{item.entity}</div>
                                            <div className="max-w-md">
                                                <Progress 
                                                    percent={item.total > 0 ? (item.processed / item.total) * 100 : (item.completed ? 100 : 0)} 
                                                    size="small" 
                                                    status={item.error ? 'exception' : (item.completed ? 'success' : 'active')}
                                                    format={() => `${item.processed} / ${item.total}`}
                                                />
                                            </div>
                                        </div>
                                        <div className="shrink-0">
                                            {renderEntityStatus(item)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </Card>

                <Card title="Album Genre Charting Update" extra={
                    <Button 
                        type="primary" 
                        icon={<PlayCircleOutlined />} 
                        onClick={handleTriggerGenreUpdate} 
                        loading={genreProgress?.is_running || genreLoading}
                        disabled={genreProgress?.is_running}
                    >
                        {genreProgress?.is_running ? 'Update in Progress...' : 'Start Genre Update'}
                    </Button>
                }>
                    <Text>
                        This process will iterate through all albums and determine the best sub-genre for charting based on the songs associated with each album.
                        It also synchronizes the album-genre associations.
                    </Text>

                    {genreProgress && (
                        <div style={{ marginTop: 24 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <Title level={5}>Progress</Title>
                                <Text strong>{genreProgress.overall_progress.toFixed(1)}%</Text>
                            </div>
                            <Progress 
                                percent={parseFloat(genreProgress.overall_progress.toFixed(1))} 
                                status={genreProgress.is_running ? 'active' : (genreProgress.overall_progress === 100 ? 'success' : 'normal')}
                                strokeColor={genreProgress.last_error ? '#ff4d4f' : undefined}
                            />
                            
                            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                                <div>
                                    {genreProgress.current_item && genreProgress.is_running && (
                                        <>
                                            <Text type="secondary">Current Album: </Text>
                                            <Text strong>{genreProgress.current_item}</Text>
                                        </>
                                    )}
                                </div>
                                <Text type="secondary">
                                    {genreProgress.processed} / {genreProgress.total} albums processed
                                </Text>
                            </div>

                            {genreProgress.last_error && (
                                <Alert 
                                    message="Last Error" 
                                    description={genreProgress.last_error} 
                                    type="warning" 
                                    showIcon 
                                    style={{ marginTop: 16 }}
                                />
                            )}
                        </div>
                    )}
                </Card>
            </Space>
        </>
    );
}
