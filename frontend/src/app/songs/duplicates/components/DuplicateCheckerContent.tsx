'use client'

import {fetchSimilarSongs} from '@/lib/api/songs';
import SongMergeComparison from '../../components/SongMergeComparison';
import DuplicateCheckerContent from '@/components/common/duplicates/DuplicateCheckerContent';
import type {DuplicateEntityConfig, MergeConfig} from '@/components/common/duplicates/types';

const config: DuplicateEntityConfig = {
    entityType: 'songs',
    displayName: 'Song',
    displayNamePlural: 'Songs',
    viewUrl: (id, slug) => `/songs/view/${id}/${slug}`,
    editUrl: (id, slug) => `/songs/edit/${id}/${slug}`,
    getEntityName: (entity) => entity.name,
    fetchSimilar: async (params) => {
        return fetchSimilarSongs(params);
    },
    MergeComponent: SongMergeComparison,
    getMergeProps: (mc: MergeConfig) => ({
        open: mc.open,
        onCancel: mc.onCancel,
        originalSongId: mc.primaryId,
        selectedSongIds: mc.selectedIds,
        onMergeComplete: mc.onMergeComplete,
    }),
    hasManualSearch: true,
};

export default function SongDuplicateChecker() {
    return <DuplicateCheckerContent config={config} />;
}
