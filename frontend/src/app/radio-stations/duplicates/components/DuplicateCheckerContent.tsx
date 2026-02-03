'use client'

import {fetchSimilarRadioStations} from '@/lib/api/radio-stations';
import RadioStationMergeComparison from '../../components/RadioStationMergeComparison';
import DuplicateCheckerContent from '@/components/common/duplicates/DuplicateCheckerContent';
import type {DuplicateEntityConfig, MergeConfig} from '@/components/common/duplicates/types';

const config: DuplicateEntityConfig = {
    entityType: 'radio_stations',
    displayName: 'Radio Station',
    displayNamePlural: 'Radio Stations',
    viewUrl: (id, slug) => `/radio-stations/view/${id}/${slug}`,
    editUrl: (id, slug) => `/radio-stations/edit/${id}/${slug}`,
    getEntityName: (entity) => entity.name,
    fetchSimilar: async (params) => {
        return fetchSimilarRadioStations(params);
    },
    MergeComponent: RadioStationMergeComparison,
    getMergeProps: (mc: MergeConfig) => ({
        open: mc.open,
        onCancel: mc.onCancel,
        originalStationId: mc.primaryId,
        selectedStationIds: mc.selectedIds,
        onMergeComplete: mc.onMergeComplete,
    }),
    hasManualSearch: true,
};

export default function RadioStationDuplicateChecker() {
    return <DuplicateCheckerContent config={config} />;
}
