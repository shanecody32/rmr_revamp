import {Descriptions} from 'antd';

import WebsiteLink from '@/components/common/navigation/WebsiteLink';
import type {BandResponse} from '@/types/api/bands';

interface SocialLinksTabProps {
    data: BandResponse;
}

export default function SocialLinksTab({data}: SocialLinksTabProps) {
    const socialLinks = [
        {key: 'website', label: 'Website'},
        {key: 'facebook_url', label: 'Facebook'},
        {key: 'twitter', label: 'Twitter'},
        {key: 'instagram_url', label: 'Instagram'},
        {key: 'youtube_url', label: 'YouTube'},
        {key: 'spotify_id', label: 'Spotify'},
        {key: 'lastfm_url', label: 'Last.fm'},
        {key: 'reverb_url', label: 'Reverb'},
        {key: 'wikipedia_url', label: 'Wikipedia'},
        {key: 'myspace_url', label: 'MySpace'},
        {key: 'cdbaby_url', label: 'CD Baby'},
        {key: 'pinterest_url', label: 'Pinterest'},
    ] as const;

    return (
        <div suppressHydrationWarning>
            <Descriptions column={2} bordered size="small">
                {socialLinks.map(({key, label}) => (
                    <Descriptions.Item key={key} label={label}>
                        {data[key] ? <WebsiteLink href={data[key] as string}/> : '-'}
                    </Descriptions.Item>
                ))}
            </Descriptions>
        </div>
    );
}
