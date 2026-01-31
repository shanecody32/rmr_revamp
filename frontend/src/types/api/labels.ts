import type {BaseEntity} from './common';

export interface LabelResponse extends BaseEntity {
}

// =============================================================================
// Merge Types
// =============================================================================

export interface MergeLabelsRequest {
    from_ids: number[];
    into_id: number;
    merged_data: Record<string, unknown>;
}

export interface LabelMergeStats {
    albums_reassigned: number;
    aliases_moved: number;
    aliases_deduped: number;
    duplicate_candidates_updated: number;
    duplicate_candidates_cleaned: number;
    labels_deleted: number;
}

export interface LabelMergeResult {
    merged_label: LabelResponse;
    stats: LabelMergeStats;
}
