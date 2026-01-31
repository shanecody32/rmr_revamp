import {api} from './config';

// Entity types that support duplicate scanning
export type ScanEntityType = 'bands' | 'albums' | 'labels' | 'radio_stations' | 'staff_members' | 'songs';

// Types
export interface ScanStateResponse {
    id: number;
    entity_type: string;
    last_processed_id: number;
    total_items_scanned: number;
    duplicates_found: number;
    is_running: boolean;
    started_at: string | null;
    stopped_at: string | null;
    stop_reason: string | null;
    last_error: string | null;
    min_similarity: number;
    jw_weight: number;
    dice_weight: number;
    max_duplicates_to_find: number;
    batch_size: number;
    delay_between_batches_ms: number;
    continuous_mode: boolean;
    continuous_delay_minutes: number;
    total_items: number;
    progress_percent: number;
}

export interface StartScanRequest {
    min_similarity?: number;
    jw_weight?: number;
    dice_weight?: number;
    max_duplicates_to_find?: number;
    batch_size?: number;
    delay_between_batches_ms?: number;
    continuous_mode?: boolean;
    reset_progress?: boolean;
}

export interface EntitySummary {
    id: number;
    name: string;
    slug: string;
    verified: number;
    approved: number;
}

export interface MatchSummary {
    candidate_id: number;
    matched_entity_id: number;
    matched_entity_name: string;
    matched_entity_slug: string;
    similarity_score: number;
    status: string;
}

export interface GroupedDuplicateResponse {
    entity: EntitySummary;
    match_count: number;
    highest_score: number;
    pending_count: number;
    dismissed_count: number;
    matches: MatchSummary[];
}

export interface PaginatedResponse<T> {
    results: T[];
    pagination: {
        page: number;
        page_size: number;
        total_pages: number;
        total_items: number;
    };
}

export interface CandidateFilterParams {
    page?: number;
    page_size?: number;
    status?: string;
    min_score?: number;
    max_score?: number;
    entity_id?: number;
}

// API functions - all parameterized by entity type
export async function getScanState(entityType: ScanEntityType): Promise<ScanStateResponse> {
    const response = await api.get<ScanStateResponse>(`/duplicate-scan/${entityType}/state`);
    return response.data;
}

export async function startScan(entityType: ScanEntityType, request: StartScanRequest = {}): Promise<ScanStateResponse> {
    const response = await api.post<ScanStateResponse>(`/duplicate-scan/${entityType}/start`, request);
    return response.data;
}

export async function stopScan(entityType: ScanEntityType): Promise<ScanStateResponse> {
    const response = await api.post<ScanStateResponse>(`/duplicate-scan/${entityType}/stop`);
    return response.data;
}

export async function clearCandidates(entityType: ScanEntityType, pendingOnly: boolean = false): Promise<{ deleted: number }> {
    const response = await api.post<{ deleted: number }>(`/duplicate-scan/${entityType}/clear`, { pending_only: pendingOnly });
    return response.data;
}

export async function getCandidatesGrouped(entityType: ScanEntityType, params: CandidateFilterParams = {}): Promise<PaginatedResponse<GroupedDuplicateResponse>> {
    const response = await api.get<PaginatedResponse<GroupedDuplicateResponse>>(`/duplicate-scan/${entityType}/candidates/grouped`, { params });
    return response.data;
}

export async function updateCandidateStatus(entityType: ScanEntityType, candidateId: number, status: string, userId?: number): Promise<void> {
    await api.put(`/duplicate-scan/${entityType}/candidates/${candidateId}`, { status, user_id: userId });
}

export async function restoreCandidate(entityType: ScanEntityType, candidateId: number): Promise<void> {
    await api.put(`/duplicate-scan/${entityType}/candidates/${candidateId}/restore`);
}

export async function getEntityMatches(entityType: ScanEntityType, entityId: number): Promise<unknown[]> {
    const response = await api.get(`/duplicate-scan/${entityType}/entities/${entityId}/matches`);
    return response.data;
}
