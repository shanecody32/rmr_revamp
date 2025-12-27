export interface CountryResponse {
    id: number;
    name: string;
    slug: string;
    continent: string;
    region: string;
    iso_three_digit: string;
    iso_two_digit: string;
    chart: boolean;
    created_at: string;
    updated_at: string;
}

export interface StateResponse {
    id: number;
    country_id: number;
    name: string;
    slug: string;
    abbrv: string;
    chart: boolean;
    new: boolean;
    correct: boolean;
    created_at: string;
    updated_at: string;
}

export interface CityResponse {
    id: number;
    name: string;
    slug: string;
    new: boolean;
    country_id: number;
    state_id: number;
    created_at: string;
    updated_at: string;
}

export interface GenreResponse {
    id: number;
    name: string;
    slug: string;
    chart: boolean;
    created_at: string;
    updated_at: string;
}

export interface SubGenreResponse {
    id: number;
    name: string;
    slug: string;
    chart: boolean;
    default: boolean;
    genre_id: number;
    created_at: string;
    updated_at: string;
}