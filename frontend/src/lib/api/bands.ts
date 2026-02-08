'use client'

import type {
    BandResponse,
    BandWithDiscographyResponse,
    BandListViewEnriched,
    BandDetailView,
    AlbumSummary,
    ApiSuccessResponse,
    MergeResult,
} from '@/types/api/bands';
import type {ApiParams, NameFilterType, PaginationResponse} from '@/types/api/common';
import {nameFilterTypeMap} from '@/types/api/common';

import {api} from './config';

export interface SimilarBand {
    id: number;
    name: string;
    similarity_score: number;
    verified: boolean;
    approved: boolean;
}

export interface SimilarityParams {
    search_term: string;
    existing_id?: number;
    jw_weight?: number;
    dice_weight?: number;
    min_similarity?: number;
    restrict_to_parent?: boolean;
    limit?: number;
}

interface MergeBandsRequest {
    from_ids: number[];
    into_id: number;
    merged_data: Partial<BandResponse>;
}

export const fetchSimilarBands = async (params: SimilarityParams): Promise<SimilarBand[]> => {
    try {
        const response = await api.get<SimilarBand[]>('/bands/similar', {params});
        return response.data;
    } catch (error) {
        console.error('Error fetching similar bands:', error);
        throw error;
    }
};

/**
 * Merge multiple bands into one.
 * This operation can take significant time as it moves all related data.
 * Timeout is extended to 5 minutes for this operation.
 */
export const mergeBands = async (data: MergeBandsRequest): Promise<MergeResult> => {
    try {
        const response = await api.post<MergeResult>('/bands/merge', data, {
            // Extended timeout for merge operations (5 minutes)
            // Merge can be slow as it moves images, songs, albums, playlists, etc.
            timeout: 5 * 60 * 1000,
        });
        return response.data;
    } catch (error) {
        console.error('Error merging bands:', error);
        throw error;
    }
};

export const fetchBandById = async (id: number): Promise<BandWithDiscographyResponse> => {
    try {
        // Fetch band details and discography in parallel
        const [bandResponse, discographyResponse] = await Promise.all([
            api.get<BandResponse>(`/bands/${id}`),
            api.get<BandWithDiscographyResponse>(`/bands/${id}/discography`),
        ]);

        // Merge the responses
        return {
            ...bandResponse.data,
            albums: discographyResponse.data.albums || []
        };
    } catch (error) {
        console.error('Error fetching band by ID:', error);
        throw error;
    }
};

interface FetchBandsParams extends ApiParams {
    country_id?: number;
    state_id?: number;
    city_id?: number;
    genre_id?: number;
    sub_genre_id?: number;
    verified?: boolean;
    approved?: boolean;
    filters?: {
        verified_approved?: boolean;
        verified_pending?: boolean;
        approved_only?: boolean;
        pending_all?: boolean;
    };
}

export const fetchBands = async (params: FetchBandsParams): Promise<{
    data: BandResponse[];
    pagination: PaginationResponse;
}> => {
    try {
        // Build query params for REST API
        const queryParams: Record<string, string | number | boolean> = {
            page: params.page ?? 1,
            page_size: params.page_size ?? 10,
        };

        if (params.name) {
            queryParams.name = params.name;
            const filterType = (params.name_filter_type ?? 'contains') as NameFilterType;
            queryParams.name_filter_type = nameFilterTypeMap[filterType] ?? filterType;
        }

        if (params.country_id) {
            queryParams.country_id = params.country_id;
        }

        if (params.state_id) {
            queryParams.state_id = params.state_id;
        }

        if (params.city_id) {
            queryParams.city_id = params.city_id;
        }

        if (params.genre_id) {
            queryParams.genre_id = params.genre_id;
        }

        if (params.sub_genre_id) {
            queryParams.sub_genre_id = params.sub_genre_id;
        }

        if (typeof params.verified === 'boolean') {
            queryParams.verified = params.verified;
        }

        if (typeof params.approved === 'boolean') {
            queryParams.approved = params.approved;
        }

        // Handle filter presets
        if (params.filters) {
            if (params.filters.verified_approved) {
                queryParams.verified = true;
                queryParams.approved = true;
            } else if (params.filters.verified_pending) {
                queryParams.verified = true;
                queryParams.approved = false;
            } else if (params.filters.approved_only) {
                queryParams.verified = false;
                queryParams.approved = true;
            } else if (params.filters.pending_all) {
                queryParams.verified = false;
                queryParams.approved = false;
            }
        }

        if (params.sort_field) {
            queryParams.sort_field = params.sort_field;
            queryParams.sort_ascending = params.sort_ascending !== false;
        }

        const response = await api.get<{
            results: BandResponse[];
            pagination: PaginationResponse;
        }>('/bands', { params: queryParams });

        // Map 'results' to 'data' for consistency with frontend expectations
        return {
            data: response.data.results,
            pagination: response.data.pagination,
        };
    } catch (error) {
        console.error('Error fetching bands:', error);
        throw error;
    }
};

export const createBand = async (data: Partial<BandResponse>): Promise<BandResponse> => {
    try {
        const response = await api.post<BandResponse>('/bands', data);
        return response.data;
    } catch (error) {
        console.error('Error creating band:', error);
        throw error;
    }
};

export const updateBand = async (id: number, data: Partial<BandResponse>): Promise<BandResponse> => {
    try {
        const response = await api.put<BandResponse>(`/bands/${id}`, data);

        // Check if we have results and return
        if (response.data) {
            return response.data;
        }

        throw new Error('No data returned from update operation');
    } catch (error) {
        console.error('Error in updateBand:', error);
        throw error;
    }
};

// =============================================================================
// Optimized View Endpoints
// =============================================================================

/**
 * Fetch bands using the optimized lightweight list endpoint.
 * Returns BandListViewEnriched with only essential fields (~10 columns).
 * Use this for list/table displays for better performance.
 */
export const fetchBandsList = async (params: FetchBandsParams): Promise<{
    data: BandListViewEnriched[];
    pagination: PaginationResponse;
}> => {
    try {
        const queryParams: Record<string, string | number | boolean> = {
            page: params.page ?? 1,
            page_size: params.page_size ?? 10,
        };

        if (params.name) {
            queryParams.name = params.name;
            const filterType = (params.name_filter_type ?? 'contains') as NameFilterType;
            queryParams.name_filter_type = nameFilterTypeMap[filterType] ?? filterType;
        }

        if (params.country_id) queryParams.country_id = params.country_id;
        if (params.state_id) queryParams.state_id = params.state_id;
        if (params.city_id) queryParams.city_id = params.city_id;
        if (params.genre_id) queryParams.genre_id = params.genre_id;
        if (params.sub_genre_id) queryParams.sub_genre_id = params.sub_genre_id;
        if (typeof params.verified === 'boolean') queryParams.verified = params.verified;
        if (typeof params.approved === 'boolean') queryParams.approved = params.approved;

        // Handle filter presets
        if (params.filters) {
            if (params.filters.verified_approved) {
                queryParams.verified = true;
                queryParams.approved = true;
            } else if (params.filters.verified_pending) {
                queryParams.verified = true;
                queryParams.approved = false;
            } else if (params.filters.approved_only) {
                queryParams.verified = false;
                queryParams.approved = true;
            } else if (params.filters.pending_all) {
                queryParams.verified = false;
                queryParams.approved = false;
            }
        }

        if (params.sort_field) {
            queryParams.sort_field = params.sort_field;
            queryParams.sort_ascending = params.sort_ascending !== false;
        }

        const response = await api.get<ApiSuccessResponse<{
            results: (BandListViewEnriched & { created?: string; modified?: string; verified?: number | boolean; approved?: number | boolean })[];
            pagination: PaginationResponse;
        }>>('/bands/list', { params: queryParams });

        // Normalize backend field names to match frontend conventions
        const normalizedResults = response.data.data.results.map(item => ({
            ...item,
            verified: Boolean(item.verified),
            approved: Boolean(item.approved),
            created_at: item.created_at || item.created || '',
            updated_at: item.updated_at || item.modified || '',
        }));

        return {
            data: normalizedResults,
            pagination: response.data.data.pagination,
        };
    } catch (error) {
        console.error('Error fetching bands list:', error);
        throw error;
    }
};

/**
 * Fetch band detail with optional album loading.
 * Use include_albums=true to get discography in a single request.
 */
export const fetchBandDetail = async (
    id: number,
    options?: { includeAlbums?: boolean }
): Promise<BandDetailView> => {
    try {
        const params: Record<string, boolean> = {};
        if (options?.includeAlbums) {
            params.include_albums = true;
        }

        const response = await api.get<ApiSuccessResponse<BandDetailView>>(
            `/bands/${id}/detail`,
            { params }
        );

        return response.data.data;
    } catch (error) {
        console.error('Error fetching band detail:', error);
        throw error;
    }
};

/**
 * Fetch band discography as lightweight summaries.
 * Use this when displaying discography in band detail views.
 */
export const fetchBandDiscographySummary = async (id: number): Promise<AlbumSummary[]> => {
    try {
        const response = await api.get<ApiSuccessResponse<{ albums: AlbumSummary[] }>>(
            `/bands/${id}/discography/summary`
        );
        return response.data.data.albums;
    } catch (error) {
        console.error('Error fetching band discography summary:', error);
        throw error;
    }
};
