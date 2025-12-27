import {Badge} from 'antd';

import type {BaseEntity} from '@/types/api/common';

interface StatusBadgeProps {
    record: BaseEntity;
}

export default function StatusBadge({record}: StatusBadgeProps) {
    if (record.verified && record.approved) {
        return <Badge status="success" text="Verified & Approved"/>;
    }
    if (record.verified) {
        return <Badge status="processing" text="Verified Only"/>;
    }
    if (record.approved) {
        return <Badge status="warning" text="Approved Only"/>;
    }
    return <Badge status="default" text="Pending"/>;
}
