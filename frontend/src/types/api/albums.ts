import type {BandResponse} from './bands';
import type {BaseEntity} from './common';
import type {GenreResponse, SubGenreResponse} from './genres';
import type {SongWithTrackInfoResponse} from './songs';

export interface AlbumResponse extends BaseEntity {
    band_id?: number;
    release_date: string | null;
    about: string;
    thanks: string;
    producer: string;
    engineer: string;
    studio: string;
    master: string;
    itunes_url: string;
    cdbaby_url: string;
    amazon_url: string;
    img: string;
    itunes_id: number;
    rovi_id: string;
    sub_genre_for_charting: number;
    genre_admin_set: boolean;
    compilation: boolean;
    soundtrack: boolean;
    approved_by: number | null;
    verified_by: number | null;
    label_id: number;
}

export interface AlbumImageResponse {
    id: number;
    album_id: number;
    path: string | null;
    filename: string | null;
    thumbname: string | null;
    created_at: string;
    updated_at: string;
}

export interface AlbumWithRelationsResponse extends AlbumResponse {
    bands: BandResponse[];
    images: AlbumImageResponse[];
    sub_genres: SubGenreResponse[];
    genres: GenreResponse[];
    songs: SongWithTrackInfoResponse[];
}
