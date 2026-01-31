import {api} from './config';
import type {BandResponse} from '@/types/api/bands';

// Types
export interface ScanStateResponse {
    id: number;
    last_processed_band_id: number;
    total_bands_scanned: number;
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
    total_bands: number;
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

export interface DuplicateCandidateResponse {
    id: number;
    band_1: BandResponse;
    band_2: BandResponse;
    similarity_score: number;
    match_reasons: Record<string, unknown> | null;
    status: string;
    reviewed_by: number | null;
    reviewed_at: string | null;
    detected_at: string;
}

export interface MatchSummary {
    candidate_id: number;
    matched_band_id: number;
    matched_band_name: string;
    matched_band_slug: string;
    similarity_score: number;
    status: string;
}

export interface BandSummary {
    id: number;
    name: string;
    slug: string;
    verified: number;
    approved: number;
}

export interface GroupedDuplicateResponse {
    band: BandSummary;
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
    band_id?: number;
}

// API functions
export async function getScanState(): Promise<ScanStateResponse> {
    const response = await api.get<ScanStateResponse>('/duplicate-scan/state');
    return response.data;
}

export async function startScan(request: StartScanRequest = {}): Promise<ScanStateResponse> {
    const response = await api.post<ScanStateResponse>('/duplicate-scan/start', request);
    return response.data;
}

export async function stopScan(): Promise<ScanStateResponse> {
    const response = await api.post<ScanStateResponse>('/duplicate-scan/stop');
    return response.data;
}

export async function clearCandidates(pendingOnly: boolean = false): Promise<{ deleted: number }> {
    const response = await api.post<{ deleted: number }>('/duplicate-scan/clear', { pending_only: pendingOnly });
    return response.data;
}

export async function getCandidates(params: CandidateFilterParams = {}): Promise<PaginatedResponse<DuplicateCandidateResponse>> {
    const response = await api.get<PaginatedResponse<DuplicateCandidateResponse>>('/duplicate-scan/candidates', { params });
    return response.data;
}

export async function getCandidatesGrouped(params: CandidateFilterParams = {}): Promise<PaginatedResponse<GroupedDuplicateResponse>> {
    const response = await api.get<PaginatedResponse<GroupedDuplicateResponse>>('/duplicate-scan/candidates/grouped', { params });
    return response.data;
}

export async function updateCandidateStatus(candidateId: number, status: string, userId?: number): Promise<void> {
    await api.put(`/duplicate-scan/candidates/${candidateId}`, { status, user_id: userId });
}

export async function restoreCandidate(candidateId: number): Promise<void> {
    await api.put(`/duplicate-scan/candidates/${candidateId}/restore`);
}

export async function getBandMatches(bandId: number): Promise<DuplicateCandidateResponse[]> {
    const response = await api.get<DuplicateCandidateResponse[]>(`/duplicate-scan/bands/${bandId}/matches`);
    return response.data;
}
