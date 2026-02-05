'use client'

import { Tag, Space, Tooltip } from 'antd';
import {
    CheckCircleOutlined,
    CloseCircleOutlined,
    ExclamationCircleOutlined,
    SyncOutlined,
    FileSearchOutlined,
    StopOutlined,
    QuestionCircleOutlined,
} from '@ant-design/icons';
import type { DataStatus, ChartStatus, EntityStatus } from '@/types/api/common';

interface EntityStatusBadgeProps {
    dataStatus: DataStatus;
    chartStatus: ChartStatus;
    dataStatusReason?: string | null;
    chartDenialReason?: string | null;
    compact?: boolean;
    showLabels?: boolean;
}

const dataStatusConfig: Record<DataStatus, { color: string; icon: React.ReactNode; label: string }> = {
    new: { color: 'default', icon: <QuestionCircleOutlined />, label: 'New' },
    validated: { color: 'success', icon: <CheckCircleOutlined />, label: 'Validated' },
    needs_review: { color: 'warning', icon: <ExclamationCircleOutlined />, label: 'Needs Review' },
    duplicate_detected: { color: 'error', icon: <FileSearchOutlined />, label: 'Duplicate' },
};

const chartStatusConfig: Record<ChartStatus, { color: string; icon: React.ReactNode; label: string }> = {
    pending: { color: 'processing', icon: <SyncOutlined spin />, label: 'Pending' },
    approved: { color: 'success', icon: <CheckCircleOutlined />, label: 'Approved' },
    denied: { color: 'error', icon: <CloseCircleOutlined />, label: 'Denied' },
    suspended: { color: 'warning', icon: <StopOutlined />, label: 'Suspended' },
};

export function EntityStatusBadge({
    dataStatus,
    chartStatus,
    dataStatusReason,
    chartDenialReason,
    compact = false,
    showLabels = true,
}: EntityStatusBadgeProps) {
    const dataConfig = dataStatusConfig[dataStatus] || dataStatusConfig.new;
    const chartConfig = chartStatusConfig[chartStatus] || chartStatusConfig.pending;

    const dataTooltip = dataStatusReason ? `${dataConfig.label}: ${dataStatusReason}` : dataConfig.label;
    const chartTooltip = chartDenialReason ? `${chartConfig.label}: ${chartDenialReason}` : chartConfig.label;

    if (compact) {
        return (
            <Space size={4}>
                <Tooltip title={`Data: ${dataTooltip}`}>
                    <Tag color={dataConfig.color} style={{ margin: 0 }}>
                        {dataConfig.icon}
                    </Tag>
                </Tooltip>
                <Tooltip title={`Chart: ${chartTooltip}`}>
                    <Tag color={chartConfig.color} style={{ margin: 0 }}>
                        {chartConfig.icon}
                    </Tag>
                </Tooltip>
            </Space>
        );
    }

    return (
        <Space size={8} direction="vertical">
            <Tooltip title={dataStatusReason}>
                <Tag icon={dataConfig.icon} color={dataConfig.color}>
                    {showLabels && `Data: ${dataConfig.label}`}
                </Tag>
            </Tooltip>
            <Tooltip title={chartDenialReason}>
                <Tag icon={chartConfig.icon} color={chartConfig.color}>
                    {showLabels && `Chart: ${chartConfig.label}`}
                </Tag>
            </Tooltip>
        </Space>
    );
}

interface DataStatusBadgeProps {
    status: DataStatus;
    reason?: string | null;
    showLabel?: boolean;
}

export function DataStatusBadge({ status, reason, showLabel = true }: DataStatusBadgeProps) {
    const config = dataStatusConfig[status] || dataStatusConfig.new;
    return (
        <Tooltip title={reason}>
            <Tag icon={config.icon} color={config.color}>
                {showLabel && config.label}
            </Tag>
        </Tooltip>
    );
}

interface ChartStatusBadgeProps {
    status: ChartStatus;
    denialReason?: string | null;
    showLabel?: boolean;
}

export function ChartStatusBadge({ status, denialReason, showLabel = true }: ChartStatusBadgeProps) {
    const config = chartStatusConfig[status] || chartStatusConfig.pending;
    return (
        <Tooltip title={denialReason}>
            <Tag icon={config.icon} color={config.color}>
                {showLabel && config.label}
            </Tag>
        </Tooltip>
    );
}

// Helper to extract status props from an entity
export function getEntityStatusProps(entity: Partial<EntityStatus>): EntityStatusBadgeProps {
    return {
        dataStatus: entity.data_status || 'new',
        chartStatus: entity.chart_status || 'pending',
        dataStatusReason: entity.data_status_reason,
        chartDenialReason: entity.chart_denial_reason,
    };
}

export default EntityStatusBadge;
