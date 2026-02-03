'use client'

import {fetchSimilarLabels} from '@/lib/api/labels';
import LabelMergeComparison from '../../components/LabelMergeComparison';
import DuplicateCheckerContent from '@/components/common/duplicates/DuplicateCheckerContent';
import type {DuplicateEntityConfig, MergeConfig} from '@/components/common/duplicates/types';

const config: DuplicateEntityConfig = {
    entityType: 'labels',
    displayName: 'Label',
    displayNamePlural: 'Labels',
    viewUrl: (id, slug) => `/labels/view/${id}/${slug}`,
    editUrl: (id, slug) => `/labels/edit/${id}/${slug}`,
    getEntityName: (entity) => entity.name,
    fetchSimilar: async (params) => {
        return fetchSimilarLabels(params);
    },
    MergeComponent: LabelMergeComparison,
    getMergeProps: (mc: MergeConfig) => ({
        open: mc.open,
        onCancel: mc.onCancel,
        originalLabelId: mc.primaryId,
        selectedLabelIds: mc.selectedIds,
        onMergeComplete: mc.onMergeComplete,
    }),
    hasManualSearch: true,
};

export default function LabelDuplicateChecker() {
    return <DuplicateCheckerContent config={config} />;
}
