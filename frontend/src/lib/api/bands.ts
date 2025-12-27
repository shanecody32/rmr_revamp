'use client'

import type {BandResponse, BandWithDiscographyResponse} from '@/types/api/bands';
import type {GenreResponse, SubGenreResponse} from '@/types/api/locations';
import type {ApiParams, NameFilterType, PaginationResponse} from '@/types/api/common';

import {api} from './config';

interface SimilarBand {
    id: number;
    name: string;
    similarity: number;
    verified: boolean;
    approved: boolean;
}

interface SimilarityParams {
    search_term: string;
    existing_id?: number;
    jw_weight?: number;
    dice_weight?: number;
    min_similarity?: number;
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

export const mergeBands = async (data: MergeBandsRequest): Promise<BandResponse> => {
    try {
        const response = await api.post<BandResponse>('/bands/merge', data);
        return response.data;
    } catch (error) {
        console.error('Error merging bands:', error);
        throw error;
    }
};

export const fetchBandById = async (id: number): Promise<BandWithDiscographyResponse> => {
    try {
        // First fetch the full band details
        const bandResponse = await api.get<BandResponse>(`/bands/${id}`);

        // Then fetch the discography
        const discographyResponse = await api.get<BandWithDiscographyResponse>(`/bands/${id}/discography`);

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

const BANDS_QUERY = `
    query Bands(
        $filters: BandsFilterInput
        $order_by: BandsOrderInput
        $pagination: PaginationInput
    ) {
        bands(filters: $filters, order_by: $order_by, pagination: $pagination) {
            nodes {
                id
                name
                slug
                verified
                verified_by_id
                approved
                approved_by_id
                created_at
                updated_at
                website
                email
                twitter
                facebook_url
                lastfm_url
                myspace_url
                google_url
                wikipedia_url
                cdbaby_url
                youtube_url
                reverb_url
                itunes_url
                instagram_url
                pinterest_url
                itunes_id
                amg_id
                rovi_id
                echo_id
                seven_digital_id
                discogs_id
                spotify_id
                rdio_id
                rss_feed
                bio
                hot_download
                city_id
                state_id
                country_id
                reviewed_by_id
                country: countries {
                    id
                    name
                    slug
                }
                state: states {
                    id
                    name
                    slug
                }
                city: cities {
                    id
                    name
                    slug
                }
                genre_links: bands_sub_genres {
                    nodes {
                        sub_genre: sub_genres {
                            id
                            name
                            slug
                            chart
                            default
                            genre_id
                            created_at
                            updated_at
                            genre: genres {
                                id
                                name
                                slug
                                chart
                                created_at
                                updated_at
                            }
                        }
                    }
                }
            }
            paginationInfo: pagination_info {
                total
                pages
                current
            }
        }
    }
`;

const nameFilterOperationMap: Record<NameFilterType, string> = {
    contains: 'contains',
    startswith: 'starts_with',
    endswith: 'ends_with',
    exact: 'eq'
};

type GraphQLSubGenreNode = SubGenreResponse & {
    genre?: GenreResponse | null;
};

type GraphQLBandNode = Omit<BandResponse, 'genres' | 'sub_genres'> & {
    genre_links?: {
        nodes?: Array<{
            sub_genre?: GraphQLSubGenreNode | null;
        } | null> | null;
    } | null;
};

interface BandsQueryResponse {
    data?: {
        bands?: {
            nodes?: GraphQLBandNode[] | null;
            paginationInfo?: {
                total?: number | null;
                pages?: number | null;
                current?: number | null;
            } | null;
        } | null;
    };
    errors?: Array<{ message?: string }>;
}

export const fetchBands = async (params: FetchBandsParams): Promise<{
    data: BandResponse[];
    pagination: PaginationResponse;
}> => {
    try {
        const pageSize = params.page_size ?? 10;
        const currentPage = Math.max((params.page ?? 1) - 1, 0);

        const filtersInput: Record<string, any> = {};

        if (params.name) {
            const filterType = params.name_filter_type ?? 'contains';
            const operation = nameFilterOperationMap[filterType];
            filtersInput.name = {[operation]: params.name};
        }

        if (params.country_id) {
            filtersInput.country_id = {eq: params.country_id};
        }

        if (params.state_id) {
            filtersInput.state_id = {eq: params.state_id};
        }

        if (params.city_id) {
            filtersInput.city_id = {eq: params.city_id};
        }

        if (typeof params.verified === 'boolean') {
            filtersInput.verified = {eq: params.verified};
        }

        if (typeof params.approved === 'boolean') {
            filtersInput.approved = {eq: params.approved};
        }

        if (params.filters) {
            if (params.filters.verified_approved) {
                filtersInput.verified = {eq: true};
                filtersInput.approved = {eq: true};
            } else if (params.filters.verified_pending) {
                filtersInput.verified = {eq: true};
                filtersInput.approved = {eq: false};
            } else if (params.filters.approved_only) {
                filtersInput.verified = {eq: false};
                filtersInput.approved = {eq: true};
            } else if (params.filters.pending_all) {
                filtersInput.verified = {eq: false};
                filtersInput.approved = {eq: false};
            }
        }

        const orderByInput: Record<string, 'ASC' | 'DESC'> = {};

        if (params.sort_field) {
            orderByInput[params.sort_field] = params.sort_ascending === false ? 'DESC' : 'ASC';
        }

        const requestVariables: Record<string, unknown> = {
            pagination: {
                page: {
                    page: currentPage,
                    limit: pageSize
                }
            },
            filters: Object.keys(filtersInput).length ? filtersInput : {},
            order_by: Object.keys(orderByInput).length ? orderByInput : {},
        };

        console.log('[Bands GraphQL] Request variables:', requestVariables);

        const response = await api.post<BandsQueryResponse>('/graphql', {
            query: BANDS_QUERY,
            variables: requestVariables
        });

        console.log('[Bands GraphQL] Response payload:', response.data);

        if (response.data.errors?.length) {
            const [firstError] = response.data.errors;
            throw new Error(firstError?.message || 'Failed to fetch bands');
        }

        const connection = response.data.data?.bands;
        const nodes = (connection?.nodes ?? []).filter(Boolean) as GraphQLBandNode[];

        const bands = nodes.map((node) => {
            const {genre_links, ...band} = node;
            const genreNodes = genre_links?.nodes ?? [];

            const genreMap = new Map<number, GenreResponse>();
            const subGenreMap = new Map<number, SubGenreResponse>();

            genreNodes.forEach((link) => {
                const subGenreNode = link?.sub_genre;
                if (!subGenreNode) {
                    return;
                }

                const {genre, ...subGenreRest} = subGenreNode;
                const normalizedSubGenre = subGenreRest as SubGenreResponse;

                if (!subGenreMap.has(normalizedSubGenre.id)) {
                    subGenreMap.set(normalizedSubGenre.id, normalizedSubGenre);
                }

                if (genre && !genreMap.has(genre.id)) {
                    genreMap.set(genre.id, genre);
                }
            });

            return {
                ...band,
                verified: Boolean(band.verified),
                approved: Boolean(band.approved),
                genres: Array.from(genreMap.values()),
                sub_genres: Array.from(subGenreMap.values()),
            } as BandResponse;
        });

        const paginationInfo = connection?.paginationInfo;
        const totalCount = paginationInfo?.total ?? bands.length;
        const totalPages = paginationInfo?.pages ?? 1;
        const current = (paginationInfo?.current ?? 0) + 1;

        const result = {
            data: bands,
            pagination: {
                page: current,
                page_size: pageSize,
                total_pages: totalPages,
                total_count: totalCount,
            }
        };

        console.log('[Bands GraphQL] Normalized result:', result);

        return result;
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
