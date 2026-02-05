'use client'

import {Space, Tag, Tooltip} from 'antd';
import type {ColumnsType} from 'antd/es/table';

import {
    getEntityActionColumn,
    getIdColumn,
    getStatusColumn,
    getCreatedAtColumn,
    getUpdatedAtColumn,
} from '@/components/common/columns/entityColumns';
import {resolveBackendImageUrl} from '@/lib/utils/media';
import type {BandListViewEnriched} from '@/types/api/bands';

export const columnOptions = [
    {key: 'actions', label: 'Actions', required: true},
    {key: 'id', label: 'ID'},
    {key: 'name', label: 'Name', required: true},
    {key: 'location', label: 'Location'},
    {key: 'genres', label: 'Genres'},
    {key: 'sub_genres', label: 'Sub-Genres'},
    {key: 'status', label: 'Status'},
    {key: 'created_at', label: 'Created At'},
    {key: 'updated_at', label: 'Updated At'},
] as const;

const MAX_VISIBLE_TAGS = 3;

interface BandColumnProps {
    onVerifyClick?: (record: BandListViewEnriched) => void;
    onFindComparisons?: (record: BandListViewEnriched) => void;
    verifyingBandId?: number | null;
}

export const getBandColumns = ({
                                   onVerifyClick,
                                   onFindComparisons,
                                   verifyingBandId
                               }: BandColumnProps): ColumnsType<BandListViewEnriched> => [
    getEntityActionColumn<BandListViewEnriched>({
        routePrefix: 'bands',
        getId: (r) => r.id,
        getSlug: (r) => r.slug || '',
        onVerifyClick,
        onFindComparisons,
        verifyingId: verifyingBandId,
    }),
    getIdColumn<BandListViewEnriched>(),
    {
        key: 'name',
        title: 'Name',
        dataIndex: 'name',
        sorter: true,
        fixed: 'left',
        render: (name: string, record: BandListViewEnriched) => {
            const imageUrl = record.image_url
                ? resolveBackendImageUrl(record.image_url)
                : null;

            return (
                <Space>
                    {imageUrl ? (
                        <img
                            src={imageUrl}
                            alt={name}
                            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                        />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-gray-400 text-xs">
                            {name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                    )}
                    <span className="font-medium">{name}</span>
                </Space>
            );
        },
    },
    {
        key: 'location',
        title: 'Location',
        render: (_, record) => {
            const parts = [];
            if (record.city_name) parts.push(record.city_name);
            if (record.state_name) parts.push(record.state_name);
            if (record.country_name) parts.push(record.country_name);
            return parts.length ? parts.join(', ') : '-';
        },
    },
    {
        key: 'genres',
        title: 'Genres',
        width: 200,
        render: (_, record) => {
            const genreNames = record.genre_names || [];

            const visible = genreNames.slice(0, MAX_VISIBLE_TAGS);
            const remaining = genreNames.length - MAX_VISIBLE_TAGS;

            return (
                <Space size={[0, 4]} wrap>
                    {visible.map((name, idx) => (
                        <Tag
                            key={`genre-${idx}`}
                            color="blue"
                        >
                            {name}
                        </Tag>
                    ))}
                    {remaining > 0 && (
                        <Tooltip title={genreNames.slice(MAX_VISIBLE_TAGS).join(', ')}>
                            <Tag>+{remaining}</Tag>
                        </Tooltip>
                    )}
                </Space>
            );
        },
    },
    {
        key: 'sub_genres',
        title: 'Sub-Genres',
        width: 200,
        render: (_, record) => {
            const subGenreNames = record.sub_genre_names || [];

            const visible = subGenreNames.slice(0, MAX_VISIBLE_TAGS);
            const remaining = subGenreNames.length - MAX_VISIBLE_TAGS;

            return (
                <Space size={[0, 4]} wrap>
                    {visible.map((name, idx) => (
                        <Tag
                            key={`sub-genre-${idx}`}
                            color="purple"
                        >
                            {name}
                        </Tag>
                    ))}
                    {remaining > 0 && (
                        <Tooltip title={subGenreNames.slice(MAX_VISIBLE_TAGS).join(', ')}>
                            <Tag>+{remaining}</Tag>
                        </Tooltip>
                    )}
                </Space>
            );
        },
    },
    getStatusColumn<BandListViewEnriched>(),
    getCreatedAtColumn<BandListViewEnriched>(),
    getUpdatedAtColumn<BandListViewEnriched>(),
];
