'use client'

import {CheckCircleOutlined, EditOutlined, EyeOutlined, LoadingOutlined} from '@ant-design/icons';
import {Button, Space, Tag,} from 'antd';
import type {ColumnsType} from 'antd/es/table';
import Link from 'next/link';

import WebsiteLink from '@/components/common/navigation/WebsiteLink';
import type {BandResponse} from '@/types/api/bands';

import {getBaseColumns} from '../../../components/tables/columns/baseColumns';

export const columnOptions = [
    {key: 'actions', label: 'Actions', required: true},
    {key: 'id', label: 'ID'},
    {key: 'name', label: 'Name', required: true},
    {key: 'location', label: 'Location'},
    {key: 'genres', label: 'Genres'},
    {key: 'sub_genres', label: 'Sub-Genres'},
    {key: 'website', label: 'Website'},
    {key: 'email', label: 'Email'},
    {key: 'social_media', label: 'Social Media'},
    {key: 'streaming', label: 'Streaming IDs'},
    {key: 'status', label: 'Status'},
    {key: 'created_at', label: 'Created At'},
    {key: 'updated_at', label: 'Updated At'},
] as const;

const baseColumns = getBaseColumns<BandResponse>();

interface GenreColumnProps {
    searchedGenreId?: number;
    searchedSubGenreId?: number;
    onVerifyClick?: (record: BandResponse) => void;
    verifyingBandId?: number | null;
}

export const getBandColumns = ({
                                   searchedGenreId,
                                   searchedSubGenreId,
                                   onVerifyClick,
                                   verifyingBandId
                               }: GenreColumnProps): ColumnsType<BandResponse> => [
    {
        key: 'actions',
        title: 'Actions',
        fixed: 'left',
        width: 200,
        render: (_, record) => (
            <Space>
                <Link
                    href={`/bands/view/${record.id}/${record.slug}`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <Button
                        type="link"
                        icon={<EyeOutlined/>}
                        size="small"
                    >
                        View
                    </Button>
                </Link>
                <Link
                    href={`/bands/edit/${record.id}/${record.slug}`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <Button
                        type="link"
                        icon={<EditOutlined/>}
                        size="small"
                    >
                        Edit
                    </Button>
                </Link>
                <Button
                    type="link"
                    icon={verifyingBandId === record.id ? <LoadingOutlined/> : <CheckCircleOutlined/>}
                    size="small"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onVerifyClick && verifyingBandId !== record.id) onVerifyClick(record);
                    }}
                    loading={verifyingBandId === record.id}
                >
                    Verify
                </Button>
            </Space>
        ),
    },
    baseColumns[0], // ID
    baseColumns[1], // Name
    {
        key: 'location',
        title: 'Location',
        render: (_, record) => {
            const parts = [];
            if (record.city?.name) parts.push(record.city.name);
            if (record.state?.name) parts.push(record.state.name);
            if (record.country?.name) parts.push(record.country.name);
            return parts.length ? parts.join(', ') : '-';
        },
    },
    {
        key: 'genres',
        title: 'Genres',
        render: (_, record) => (
            <Space wrap>
                {record.genres?.map(genre => {
                    const isHighlighted = searchedGenreId === genre.id;
                    return (
                        <Tag
                            key={`genre-${genre.id}`}
                            color="blue"
                            style={{
                                opacity: searchedGenreId && !isHighlighted ? 0.6 : 1,
                                transition: 'opacity 0.2s ease',
                                backgroundColor: isHighlighted ? '#e6f4ff' : undefined,
                                color: isHighlighted ? '#1677ff' : undefined,
                                borderColor: isHighlighted ? '#69b1ff' : undefined
                            }}
                        >
                            {genre.name}
                        </Tag>
                    );
                })}
            </Space>
        ),
    },
    {
        key: 'sub_genres',
        title: 'Sub-Genres',
        render: (_, record) => (
            <Space wrap>
                {record.sub_genres?.map(subGenre => {
                    const isHighlighted = searchedSubGenreId === subGenre.id;
                    return (
                        <Tag
                            key={`sub-genre-${subGenre.id}`}
                            color="purple"
                            style={{
                                opacity: searchedSubGenreId && !isHighlighted ? 0.6 : 1,
                                transition: 'opacity 0.2s ease',
                                backgroundColor: isHighlighted ? '#f9f0ff' : undefined,
                                color: isHighlighted ? '#722ed1' : undefined,
                                borderColor: isHighlighted ? '#b37feb' : undefined
                            }}
                        >
                            {subGenre.name}
                        </Tag>
                    );
                })}
            </Space>
        ),
    },
    {
        key: 'website',
        title: 'Website',
        dataIndex: 'website',
        render: (website: string) => website ? <WebsiteLink href={website}/> : null,
    },
    {
        key: 'email',
        title: 'Email',
        dataIndex: 'email',
        render: (email: string) => email || '-',
    },
    {
        key: 'social_media',
        title: 'Social Media',
        render: (_, record) => {
            const socials = [];
            if (record.facebook_url) socials.push('Facebook');
            if (record.twitter) socials.push('Twitter');
            if (record.instagram_url) socials.push('Instagram');
            if (record.youtube_url) socials.push('YouTube');
            if (record.reverb_url) socials.push('Reverb');
            if (record.lastfm_url) socials.push('Last.fm');
            if (record.wikipedia_url) socials.push('Wikipedia');
            return socials.length ? socials.join(', ') : '-';
        },
    },
    {
        key: 'streaming',
        title: 'Streaming IDs',
        render: (_, record) => {
            const ids = [];
            if (record.spotify_id) ids.push(`Spotify: ${record.spotify_id}`);
            if (record.itunes_id) ids.push(`iTunes: ${record.itunes_id}`);
            if (record.amg_id) ids.push(`AMG: ${record.amg_id}`);
            if (record.rovi_id) ids.push(`Rovi: ${record.rovi_id}`);
            return ids.length ? ids.join(', ') : '-';
        },
    },
    baseColumns[2], // Status
    baseColumns[3], // Created At
    baseColumns[4], // Updated At
];
