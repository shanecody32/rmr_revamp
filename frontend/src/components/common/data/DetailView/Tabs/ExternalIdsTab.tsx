import {Descriptions} from 'antd';

import type {BandResponse} from '@/types/api/bands';

interface ExternalIdsTabProps {
    data: BandResponse;
}

export default function ExternalIdsTab({data}: ExternalIdsTabProps) {
    const externalIds = [
        {key: 'itunes_id', label: 'iTunes ID'},
        {key: 'amg_id', label: 'AMG ID'},
        {key: 'rovi_id', label: 'Rovi ID'},
        {key: 'echo_id', label: 'Echo ID'},
        {key: 'seven_digital_id', label: '7digital ID'},
        {key: 'discogs_id', label: 'Discogs ID'},
        {key: 'rdio_id', label: 'Rdio ID'},
        {key: 'spotify_id', label: 'Spotify ID'},
    ] as const;

    return (
        <Descriptions column={2} bordered size="small">
            {externalIds.map(({key, label}) => (
                <Descriptions.Item key={key} label={label}>
                    {data[key] || '-'}
                </Descriptions.Item>
            ))}
        </Descriptions>
    );
}
