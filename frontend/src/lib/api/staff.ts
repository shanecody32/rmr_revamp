'use client'

import type {
    StaffResponse,
    StaffDetailView,
    StaffListViewEnriched,
    StaffFilterParams,
    StaffDetailParams,
    StaffSimilarityParams,
    MergeStaffRequest,
    StaffMergeResult,
    StaffTransferRequest,
    StaffTransferResult,
    ArchiveStaffRequest,
    SimilarStaff,
} from '@/types/api/staff';
import type {ApiSuccessResponse} from '@/types/api/bands';
import type {PaginationResponse} from '@/types/api/common';

import {api} from './config';

// =============================================================================
// Response Types
// =============================================================================

interface PaginatedStaffResponse {
    results: StaffResponse[];
    pagination: PaginationResponse;
}

interface PaginatedStaffListResponse {
    results: StaffListViewEnriched[];
    pagination: PaginationResponse;
}

// =============================================================================
// CRUD Operations
// =============================================================================

/**
 * Fetch staff members with full response.
 * For list/table displays, use fetchStaffList instead for better performance.
 */
export const fetchStaff = async (params: StaffFilterParams = {}): Promise<PaginatedStaffResponse> => {
    try {
        const response = await api.get<PaginatedStaffResponse>('/staff_members', {params});
        return response.data;
    } catch (error) {
        console.error('Error fetching staff members:', error);
        throw error;
    }
};

/**
 * Fetch staff members with lightweight response.
 * Use this for list/table displays for better performance.
 */
export const fetchStaffList = async (params: StaffFilterParams = {}): Promise<PaginatedStaffListResponse> => {
    try {
        const response = await api.get<ApiSuccessResponse<PaginatedStaffListResponse>>('/staff_members/list', {params});
        return response.data.data;
    } catch (error) {
        console.error('Error fetching staff list:', error);
        throw error;
    }
};

/**
 * Fetch a single staff member by ID with full details.
 */
export const fetchStaffById = async (
    id: number,
    params: StaffDetailParams = {}
): Promise<StaffDetailView> => {
    try {
        const response = await api.get<ApiSuccessResponse<StaffDetailView>>(
            `/staff_members/${id}/detail`,
            {params}
        );
        return response.data.data;
    } catch (error) {
        console.error('Error fetching staff member:', error);
        throw error;
    }
};

/**
 * Fetch a single staff member by ID (backward compatible).
 */
export const fetchStaffByIdLegacy = async (id: number): Promise<StaffDetailView> => {
    try {
        const response = await api.get<StaffDetailView>(`/staff_members/${id}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching staff member:', error);
        throw error;
    }
};

/**
 * Create a new staff member.
 */
export const createStaff = async (data: Partial<StaffResponse>): Promise<StaffResponse> => {
    try {
        const response = await api.post<StaffResponse>('/staff_members', data);
        return response.data;
    } catch (error) {
        console.error('Error creating staff member:', error);
        throw error;
    }
};

/**
 * Update an existing staff member.
 */
export const updateStaff = async (id: number, data: Partial<StaffResponse>): Promise<StaffResponse> => {
    try {
        const response = await api.put<StaffResponse>(`/staff_members/${id}`, data);
        return response.data;
    } catch (error) {
        console.error('Error updating staff member:', error);
        throw error;
    }
};

/**
 * Delete a staff member.
 */
export const deleteStaff = async (id: number): Promise<void> => {
    try {
        await api.delete(`/staff_members/${id}`);
    } catch (error) {
        console.error('Error deleting staff member:', error);
        throw error;
    }
};

// =============================================================================
// Similarity & Merge Operations
// =============================================================================

/**
 * Find similar staff members for duplicate detection.
 * Station-scoped when restrict_to_parent is true.
 */
export const fetchSimilarStaff = async (params: StaffSimilarityParams): Promise<SimilarStaff[]> => {
    try {
        const response = await api.get<SimilarStaff[]>('/staff_members/similar', {params});
        return response.data;
    } catch (error) {
        console.error('Error fetching similar staff:', error);
        throw error;
    }
};

/**
 * Merge multiple staff members into one.
 * All staff must belong to the same radio station.
 * Extended timeout (5 minutes) for this operation.
 */
export const mergeStaff = async (data: MergeStaffRequest): Promise<StaffMergeResult> => {
    try {
        const response = await api.post<StaffMergeResult>('/staff_members/merge', data, {
            // Extended timeout for merge operations (5 minutes)
            timeout: 5 * 60 * 1000,
        });
        return response.data;
    } catch (error) {
        console.error('Error merging staff members:', error);
        throw error;
    }
};

// =============================================================================
// Transfer Operations
// =============================================================================

/**
 * Transfer a staff member to a new radio station.
 * Creates a new profile at the target station and archives the old profile.
 */
export const transferStaff = async (data: StaffTransferRequest): Promise<StaffTransferResult> => {
    try {
        const response = await api.post<ApiSuccessResponse<StaffTransferResult>>(
            `/staff_members/${data.staff_member_id}/transfer`,
            data
        );
        return response.data.data;
    } catch (error) {
        console.error('Error transferring staff member:', error);
        throw error;
    }
};

/**
 * Archive a staff member.
 */
export const archiveStaff = async (id: number, reason: string): Promise<StaffResponse> => {
    try {
        const data: ArchiveStaffRequest = {reason};
        const response = await api.post<ApiSuccessResponse<StaffResponse>>(
            `/staff_members/${id}/archive`,
            data
        );
        return response.data.data;
    } catch (error) {
        console.error('Error archiving staff member:', error);
        throw error;
    }
};

/**
 * Unarchive a staff member.
 */
export const unarchiveStaff = async (id: number): Promise<StaffResponse> => {
    try {
        const response = await api.post<ApiSuccessResponse<StaffResponse>>(
            `/staff_members/${id}/unarchive`
        );
        return response.data.data;
    } catch (error) {
        console.error('Error unarchiving staff member:', error);
        throw error;
    }
};

// =============================================================================
// Sub-Genre Operations
// =============================================================================

/**
 * Recalculate sub-genres for a staff member based on playlist archives.
 * Uses the 5+ unique songs from 5+ unique bands threshold.
 */
export const recalculateStaffSubGenres = async (id: number): Promise<number[]> => {
    try {
        const response = await api.post<ApiSuccessResponse<number[]>>(
            `/staff_members/${id}/recalculate-genres`
        );
        return response.data.data;
    } catch (error) {
        console.error('Error recalculating sub-genres:', error);
        throw error;
    }
};

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Build query string for staff filter params.
 */
export function buildStaffQueryParams(params: StaffFilterParams): Record<string, string | number | boolean> {
    const queryParams: Record<string, string | number | boolean> = {};

    if (params.page !== undefined) queryParams.page = params.page;
    if (params.page_size !== undefined) queryParams.page_size = params.page_size;
    if (params.name) queryParams.name = params.name;
    if (params.name_filter_type) queryParams.name_filter_type = params.name_filter_type;
    if (params.radio_station_id !== undefined) queryParams.radio_station_id = params.radio_station_id;
    if (params.verified !== undefined) queryParams.verified = params.verified;
    if (params.approved !== undefined) queryParams.approved = params.approved;
    if (params.archived !== undefined) queryParams.archived = params.archived;
    if (params.has_playlist !== undefined) queryParams.has_playlist = params.has_playlist;
    if (params.sort_field) queryParams.sort_field = params.sort_field;
    if (params.sort_ascending !== undefined) queryParams.sort_ascending = params.sort_ascending;

    return queryParams;
}
