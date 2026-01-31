import type {BaseEntity} from './common';

export interface SongResponse extends BaseEntity {
    lyrics?: string;
    lyrics_writer?: string;
    music_writer?: string;
    license?: string;
    publisher?: string;
    length?: number;
    release_date?: string | null;
    itunes_url?: string;
    itunes_img?: string;
    itunes_preview?: string;
    itunes_id?: number;
    rovi_id?: string;
    echo_id?: string;
    verified_by?: number | null;
    approved_by?: number | null;
    band_id: number;
    sub_genre_id: number;
}

export interface SongWithTrackInfoResponse {
    id: number;
    album_id: number;
    song_id: number;
    track_number: number;
    disc_number?: number;
    created_at?: string;
    updated_at?: string;
    created?: string;
    modified?: string;
    song: SongResponse;
}
