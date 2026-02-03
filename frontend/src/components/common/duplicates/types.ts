import type {ReactNode} from 'react';
import type {ScanEntityType} from '@/lib/api/duplicateScan';
import type {SimilarEntity} from '@/components/common/modals/SimilarEntitiesModal';

export interface DuplicateEntityConfig {
    entityType: ScanEntityType;
    displayName: string;
    displayNamePlural: string;
    viewUrl: (id: number, slug: string) => string;
    editUrl: (id: number, slug: string) => string;
    getEntityName: (entity: any) => string;
    fetchSimilar: (params: {search_term: string; min_similarity: number; limit: number; existing_id?: number}) => Promise<(SimilarEntity & Record<string, any>)[]>;
    MergeComponent: React.ComponentType<any>;
    getMergeProps: (config: MergeConfig) => Record<string, any>;
    hasManualSearch: boolean;
    renderEntityItem?: (entity: any, isSelected: boolean) => ReactNode;
    getEntityDisplayName?: (entity: any) => string;
}

export interface MergeConfig {
    open: boolean;
    onCancel: () => void;
    onMergeComplete: () => void;
    primaryId: number;
    selectedIds: number[];
    selectedEntities?: any[];
}
