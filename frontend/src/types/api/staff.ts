// =============================================================================
// Staff Member Types
// =============================================================================

/**
 * Lightweight staff data for list/table displays.
 * Fetches only ~12 columns instead of 40+.
 */
export interface StaffListView {
    id: number;
    first_name: string | null;
    last_name: string | null;
    on_air_name: string | null;
    radio_station_id: number | null;
    email: string | null;
    position: string | null;
    verified: number;
    approved: number;
    archived: number;
    has_playlist: number;
    created: string | null;
    modified: string | null;
}

/**
 * Enriched staff list view with resolved station name and sub-genres.
 * Use this for list/table displays.
 */
export interface StaffListViewEnriched extends StaffListView {
    station_name: string | null;
    sub_genre_names: string[];
    image_url: string | null;
    is_transfer_target: boolean;
    is_transfer_source: boolean;
}

/**
 * Staff summary for embedding in other responses.
 */
export interface StaffSummary {
    id: number;
    first_name: string | null;
    last_name: string | null;
    on_air_name: string | null;
    position: string | null;
    image_url: string | null;
}

/**
 * Staff image response.
 */
export interface StaffImageResponse {
    id: number;
    staff_member_id: number | null;
    path: string | null;
    filename: string | null;
    thumbname: string | null;
    type: string | null;
    created: string | null;
    modified: string | null;
}

/**
 * Staff link response.
 */
export interface StaffLinkResponse {
    id: number;
    staff_member_id: number | null;
    link: string | null;
    type: string | null;
    created: string | null;
    modified: string | null;
}

/**
 * Staff phone response.
 */
export interface StaffPhoneResponse {
    id: number;
    staff_member_id: number | null;
    phone: string | null;
    ext: number | null;
    type: string | null;
    created: string | null;
    modified: string | null;
}

/**
 * Staff address response.
 */
export interface StaffAddressResponse {
    id: number;
    staff_member_id: number | null;
    address: string | null;
    address2: string | null;
    city_id: number | null;
    state_id: number | null;
    country_id: number | null;
    postal_code_id: number | null;
    type: string | null;
    created: string | null;
    modified: string | null;
}

/**
 * Sub-genre response (simplified).
 */
export interface SubGenreResponse {
    id: number;
    name: string | null;
    slug: string | null;
    genre_id: number | null;
}

/**
 * Radio station summary (simplified for embedding in staff views).
 */
export interface StaffRadioStationSummary {
    id: number;
    name: string | null;
    slug: string | null;
    call_letters: string | null;
}

/**
 * Transfer link info.
 */
export interface StaffTransferLink {
    id: number;
    first_name: string | null;
    last_name: string | null;
    on_air_name: string | null;
    radio_station_id: number | null;
    station_name: string | null;
}

/**
 * Full staff member response with all fields.
 */
export interface StaffResponse {
    id: number;
    radio_station_id: number | null;
    user_id: number | null;
    orig_username: string | null;
    first_name: string | null;
    last_name: string | null;
    slug: string | null;
    on_air_name: string | null;
    position: string | null;
    email: string | null;
    show_name: string | null;
    start_time: string | null;
    end_time: string | null;
    days_on: string | null;
    bio: string | null;
    show_description: string | null;
    has_playlist: number;
    applied: number;
    approved: number;
    verified: number;
    automatic: number;
    playlist_finalised: number;
    reported: number;
    lw_reported: number;
    last_reported: string | null;
    station_control: number;
    spotlight: number;
    imported_from_file: number;
    archived: number;
    archived_at: string | null;
    archived_reason: string | null;
    transferred_to_id: number | null;
    transferred_from_id: number | null;
    admin_editable: number;
    created: string | null;
    modified: string | null;
    // Relations
    station_name?: string | null;
    sub_genres?: SubGenreResponse[];
    images?: StaffImageResponse[];
}

/**
 * Full staff detail view with all relations.
 */
export interface StaffDetailView extends StaffResponse {
    station?: StaffRadioStationSummary;
    links?: StaffLinkResponse[];
    addresses?: StaffAddressResponse[];
    phone_numbers?: StaffPhoneResponse[];
    transferred_to?: StaffTransferLink;
    transferred_from?: StaffTransferLink;
}

// Note: ApiSuccessResponse is imported from @/types/api/bands when needed

// =============================================================================
// Merge Types
// =============================================================================

/**
 * Request body for merging staff members.
 */
export interface MergeStaffRequest {
    from_ids: number[];
    into_id: number;
    merged_data: Partial<StaffResponse>;
}

/**
 * Statistics about what was moved during a merge operation.
 */
export interface StaffMergeStats {
    images_moved: number;
    images_deduped: number;
    links_moved: number;
    links_deduped: number;
    phones_moved: number;
    phones_deduped: number;
    addresses_moved: number;
    aliases_moved: number;
    aliases_deduped: number;
    playlists_moved: number;
    playlists_aggregated: number;
    playlist_archives_moved: number;
    playlist_archives_aggregated: number;
    sub_genres_calculated: number;
    duplicate_candidates_updated: number;
    duplicate_candidates_cleaned: number;
    staff_deleted: number;
}

/**
 * Result of a merge operation.
 */
export interface StaffMergeResult {
    merged_staff: StaffResponse;
    stats: StaffMergeStats;
}

// =============================================================================
// Merge Preview Types
// =============================================================================

export interface StaffRelatedCounts {
    images: number;
    links: number;
    phones: number;
    addresses: number;
    aliases: number;
    playlists: number;
    playlist_archives: number;
    sub_genres: number;
    duplicate_candidates: number;
}

export interface StaffMergePreviewItem {
    staff_id: number;
    staff_name: string;
    counts: StaffRelatedCounts;
}

export interface StaffMergePreviewResponse {
    staff: StaffMergePreviewItem[];
    totals: StaffRelatedCounts;
}

// =============================================================================
// Transfer Types
// =============================================================================

/**
 * Request body for transferring a staff member to a new station.
 */
export interface StaffTransferRequest {
    staff_member_id: number;
    new_station_id: number;
    transfer_reason: string;
}

/**
 * Result of a transfer operation.
 */
export interface StaffTransferResult {
    old_profile: StaffResponse;
    new_profile: StaffResponse;
}

/**
 * Request body for archiving a staff member.
 */
export interface ArchiveStaffRequest {
    reason: string;
}

// =============================================================================
// Similarity Types
// =============================================================================

/**
 * Similar staff member result from similarity search.
 */
export interface SimilarStaff {
    id: number;
    first_name: string | null;
    last_name: string | null;
    on_air_name: string | null;
    radio_station_id: number | null;
    similarity_score: number;
    verified: number;
    approved: number;
    station_name: string | null;
    station_location: string | null;
}

// =============================================================================
// Filter/Query Types
// =============================================================================

/**
 * Filter parameters for staff list endpoints.
 */
export interface StaffFilterParams {
    page?: number;
    page_size?: number;
    name?: string;
    name_filter_type?: 'contains' | 'starts_with' | 'ends_with' | 'exact_match';
    radio_station_id?: number;
    verified?: boolean;
    approved?: boolean;
    archived?: boolean;
    has_playlist?: boolean;
    sort_field?: string;
    sort_ascending?: boolean;
}

/**
 * Detail parameters for staff detail endpoint.
 */
export interface StaffDetailParams {
    include_images?: boolean;
    include_addresses?: boolean;
    include_links?: boolean;
    include_phones?: boolean;
    include_sub_genres?: boolean;
}

/**
 * Similarity search parameters.
 */
export interface StaffSimilarityParams {
    search_term: string;
    existing_id?: number;
    radio_station_id?: number;
    restrict_to_parent?: boolean;
    jw_weight?: number;
    dice_weight?: number;
    min_similarity?: number;
    limit?: number;
}

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Get the display name for a staff member.
 */
export function getStaffDisplayName(staff: {
    first_name?: string | null;
    last_name?: string | null;
    on_air_name?: string | null;
}): string {
    if (staff.on_air_name && staff.on_air_name.trim()) {
        return staff.on_air_name;
    }

    const first = staff.first_name?.trim() || '';
    const last = staff.last_name?.trim() || '';

    if (first && last) {
        return `${first} ${last}`;
    } else if (first) {
        return first;
    } else if (last) {
        return last;
    }

    return 'Unknown';
}

/**
 * Check if a staff member is archived.
 */
export function isStaffArchived(staff: { archived?: number }): boolean {
    return staff.archived === 1;
}

/**
 * Check if a staff member was transferred to another profile.
 */
export function isStaffTransferSource(staff: { transferred_to_id?: number | null }): boolean {
    return staff.transferred_to_id !== null && staff.transferred_to_id !== undefined;
}

/**
 * Check if a staff member was created via transfer.
 */
export function isStaffTransferTarget(staff: { transferred_from_id?: number | null }): boolean {
    return staff.transferred_from_id !== null && staff.transferred_from_id !== undefined;
}
