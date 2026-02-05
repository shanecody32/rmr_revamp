'use client'

import {Typography} from 'antd';
import {memo} from 'react';

import {formatDate} from '@/lib/utils';

const {Text, Link} = Typography;

interface AlbumDetailsProps {
    name: string;
    releaseDate?: string | null;
    label?: string;
    itunesUrl?: string;
}

const AlbumDetails = memo(function AlbumDetails({
                                         name,
                                         releaseDate,
                                         label,
                                         itunesUrl
                                     }: AlbumDetailsProps) {
    return (
        <div>
            <Text strong className="text-lg">{name}</Text>
            <div className="space-y-1">
                {releaseDate && (
                    <Text type="secondary">
                        Released: {formatDate(releaseDate)}
                    </Text>
                )}
                {label && (
                    <div>
                        <Text type="secondary">
                            Label: {label}
                        </Text>
                    </div>
                )}
                {itunesUrl && (
                    <div>
                        <Link href={itunesUrl} target="_blank">
                            View on iTunes
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
});

export default AlbumDetails;
