// Removed unused import:  Bas eEntity  './common';

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
    genre_id: number;
    default: boolean;
    chart: boolean;
    created_at: string;
    updated_at: string;
}
