import type {AlbumWithRelationsResponse} from './albums';
import type {BaseEntity} from './common';
import type {GenreResponse, SubGenreResponse} from './locations';

export interface BandImageResponse {
    id: number;
    band_id: number;
    path: string | null;
    filename: string | null;
    thumbname: string | null;
    order: number;
    created_at: string;
    updated_at: string;
}

export interface BandResponse extends BaseEntity {
    website: string | null;
    email: string | null;
    twitter: string | null;
    facebook_url: string | null;
    lastfm_url: string | null;
    myspace_url: string | null;
    google_url: string | null;
    wikipedia_url: string | null;
    cdbaby_url: string | null;
    youtube_url: string | null;
    reverb_url: string | null;
    itunes_url: string | null;
    instagram_url: string | null;
    pinterest_url: string | null;
    itunes_id: number | null;
    amg_id: number | null;
    rovi_id: string | null;
    echo_id: string | null;
    seven_digital_id: number | null;
    discogs_id: number | null;
    spotify_id: string | null;
    rdio_id: number | null;
    rss_feed: string | null;
    bio: string | null;
    hot_download: boolean;
    city_id: number | null;
    state_id: number | null;
    country_id: number | null;
    reviewed_by_id: number | null;
    // Add relations
    country?: { id: number; name: string; slug: string };
    state?: { id: number; name: string; slug: string };
    city?: { id: number; name: string; slug: string };
    genres?: GenreResponse[];
    sub_genres?: SubGenreResponse[];
    images?: BandImageResponse[];
}

export interface BandWithDiscographyResponse extends BandResponse {
    albums?: AlbumWithRelationsResponse[];
}

// Export alias for common usage
export type BandImage = BandImageResponse;
