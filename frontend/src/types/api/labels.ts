// =============================================================================
// Label Response Types
// =============================================================================

export interface LabelResponse {
    id: number;
    name: string;
    slug: string;
    album_count: number;
    created_at: string | null;
    updated_at: string | null;
}

export type LabelListItem = LabelResponse;

// =============================================================================
// Request Types
// =============================================================================

export interface CreateLabelRequest {
    name: string;
}

export interface UpdateLabelRequest {
    name?: string;
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
