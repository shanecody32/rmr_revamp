'use client'

import { useState } from 'react';
import { Popover, Descriptions, Timeline, Typography, Spin, Button, Space, Divider } from 'antd';
import { HistoryOutlined, InfoCircleOutlined } from '@ant-design/icons';
import type { EntityStatus, StatusHistoryEntry, DataStatus, ChartStatus } from '@/types/api/common';
import { getStatusHistory, EntityType } from '@/lib/api/status';
import { DataStatusBadge, ChartStatusBadge } from './EntityStatusBadge';

const { Text, Paragraph } = Typography;

interface StatusPopoverProps {
    entityType: EntityType;
    entityId: number;
    entity: Partial<EntityStatus>;
    children?: React.ReactNode;
}

function formatDate(dateString: string | null | undefined): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
}

function StatusContent({
    entity,
    history,
    loading,
}: {
    entity: Partial<EntityStatus>;
    history: StatusHistoryEntry[];
    loading: boolean;
}) {
    return (
        <div style={{ width: 350, maxHeight: 400, overflow: 'auto' }}>
            <Descriptions size="small" column={1} bordered>
                <Descriptions.Item label="Data Status">
                    <Space>
                        <DataStatusBadge status={entity.data_status || 'new'} showLabel />
                        {entity.data_status_reason && (
                            <Text type="secondary">({entity.data_status_reason})</Text>
                        )}
                    </Space>
                </Descriptions.Item>
                {entity.data_status_note && (
                    <Descriptions.Item label="Data Note">
                        <Paragraph style={{ margin: 0 }} ellipsis={{ rows: 2, expandable: true }}>
                            {entity.data_status_note}
                        </Paragraph>
                    </Descriptions.Item>
                )}
                <Descriptions.Item label="Data Updated">
                    {formatDate(entity.data_status_at)}
                </Descriptions.Item>

                <Descriptions.Item label="Chart Status">
                    <Space>
                        <ChartStatusBadge status={entity.chart_status || 'pending'} showLabel />
                        {entity.chart_denial_reason && (
                            <Text type="secondary">({entity.chart_denial_reason})</Text>
                        )}
                    </Space>
                </Descriptions.Item>
                {entity.chart_status_note && (
                    <Descriptions.Item label="Chart Note">
                        <Paragraph style={{ margin: 0 }} ellipsis={{ rows: 2, expandable: true }}>
                            {entity.chart_status_note}
                        </Paragraph>
                    </Descriptions.Item>
                )}
                <Descriptions.Item label="Chart Updated">
                    {formatDate(entity.chart_status_at)}
                </Descriptions.Item>
            </Descriptions>

            {history.length > 0 && (
                <>
                    <Divider style={{ margin: '12px 0' }}>
                        <Text type="secondary">
                            <HistoryOutlined /> Recent History
                        </Text>
                    </Divider>
                    <Timeline
                        items={history.slice(0, 5).map((entry) => ({
                            color: entry.action_type.includes('chart') ? 'blue' : 'green',
                            children: (
                                <div>
                                    <Text strong>{entry.action_type}</Text>
                                    <br />
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        {entry.old_status && `${entry.old_status} → `}
                                        {entry.new_status}
                                    </Text>
                                    {entry.reason && (
                                        <>
                                            <br />
                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                                Reason: {entry.reason}
                                            </Text>
                                        </>
                                    )}
                                    <br />
                                    <Text type="secondary" style={{ fontSize: 11 }}>
                                        {formatDate(entry.timestamp)}
                                    </Text>
                                </div>
                            ),
                        }))}
                    />
                </>
            )}
            {loading && (
                <div style={{ textAlign: 'center', padding: 12 }}>
                    <Spin size="small" />
                </div>
            )}
        </div>
    );
}

export function StatusPopover({ entityType, entityId, entity, children }: StatusPopoverProps) {
    const [history, setHistory] = useState<StatusHistoryEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [loaded, setLoaded] = useState(false);

    const handleOpenChange = async (open: boolean) => {
        if (open && !loaded) {
            setLoading(true);
            try {
                const data = await getStatusHistory(entityType, entityId);
                setHistory(data);
                setLoaded(true);
            } catch (error) {
                console.error('Failed to load status history:', error);
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <Popover
            content={<StatusContent entity={entity} history={history} loading={loading} />}
            title={
                <Space>
                    <InfoCircleOutlined />
                    Status Details
                </Space>
            }
            trigger="click"
            placement="bottomLeft"
            onOpenChange={handleOpenChange}
        >
            {children || (
                <Button type="text" size="small" icon={<InfoCircleOutlined />}>
                    Status
                </Button>
            )}
        </Popover>
    );
}

export default StatusPopover;
