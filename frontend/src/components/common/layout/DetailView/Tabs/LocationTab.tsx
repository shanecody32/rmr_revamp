import {Descriptions} from 'antd';

import type {BandResponse} from '@/types/api/bands';

interface LocationTabProps {
    data: BandResponse;
}

export default function LocationTab({data}: LocationTabProps) {
    return (
        <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="Country" span={2}>
                {data.country?.name || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="State">
                {data.state?.name || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="City">
                {data.city?.name || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="IDs" span={2}>
                Country: {data.country_id || '-'} •
                State: {data.state_id || '-'} •
                City: {data.city_id || '-'}
            </Descriptions.Item>
        </Descriptions>
    );
}