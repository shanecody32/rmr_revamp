'use client'

import {fetchSimilarAlbums} from '@/lib/api/albums';
import AlbumMergeComparison from '../../components/AlbumMergeComparison';
import DuplicateCheckerContent from '@/components/common/duplicates/DuplicateCheckerContent';
import type {DuplicateEntityConfig, MergeConfig} from '@/components/common/duplicates/types';

const config: DuplicateEntityConfig = {
    entityType: 'albums',
    displayName: 'Album',
    displayNamePlural: 'Albums',
    viewUrl: (id, slug) => `/albums/view/${id}/${slug}`,
    editUrl: (id, slug) => `/albums/edit/${id}/${slug}`,
    getEntityName: (entity) => entity.name,
    fetchSimilar: async (params) => {
        return fetchSimilarAlbums(params);
    },
    MergeComponent: AlbumMergeComparison,
    getMergeProps: (mc: MergeConfig) => ({
        open: mc.open,
        onCancel: mc.onCancel,
        originalAlbumId: mc.primaryId,
        selectedAlbumIds: mc.selectedIds,
        onMergeComplete: mc.onMergeComplete,
    }),
    hasManualSearch: true,
};

export default function AlbumDuplicateChecker() {
    return <DuplicateCheckerContent config={config} />;
}
