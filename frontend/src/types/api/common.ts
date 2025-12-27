// Common types used across multiple API endpoints
export type NameFilterType = 'contains' | 'startswith' | 'endswith' | 'exact';

// Map our internal filter types to the API's expected values
export const nameFilterTypeMap: Record<NameFilterType, string> = {
    'contains': 'contains',
    'startswith': 'starts_with',
    'endswith': 'ends_with',
    'exact': 'exact_match'
};

export interface ApiParams {
    page?: number;
    page_size?: number;
    sort_field?: string;
    sort_ascending?: boolean;
    name?: string;
    name_filter_type?: NameFilterType;
    filters?: Record<string, boolean | undefined>;
}

// Base interface for common fields across entities
export interface BaseEntity {
    id: number;
    name: string;
    slug: string;
    verified: boolean;
    verified_by_id: number | null;
    approved: boolean;
    approved_by_id: number | null;
    created_at: string;
    updated_at: string;
}

export interface PaginationResponse {
    page: number;
    page_size: number;
    total_pages: number;
    total_count?: number;
    total_items?: number;
}

export interface ApiResponse<T> {
    results: T[];
    pagination: PaginationResponse;
}