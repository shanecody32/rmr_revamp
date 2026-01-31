'use client'

import type {FieldGroup} from './types';

export const FIELD_GROUPS: FieldGroup[] = [
    {
        key: 'basic',
        title: 'Basic Information',
        fields: [
            {key: 'name', label: 'Name'},
            {key: 'slug', label: 'Slug'},
            {key: 'band_id', label: 'Band'},
            {key: 'sub_genre_id', label: 'Sub-Genre'},
        ]
    },
    {
        key: 'metadata',
        title: 'Metadata',
        fields: [
            {key: 'lyrics', label: 'Lyrics'},
            {key: 'lyrics_writer', label: 'Lyrics Writer'},
            {key: 'music_writer', label: 'Music Writer'},
            {key: 'license', label: 'License'},
            {key: 'publisher', label: 'Publisher'},
            {key: 'length', label: 'Length'},
            {key: 'release_date', label: 'Release Date'},
        ]
    },
    {
        key: 'external',
        title: 'External IDs',
        fields: [
            {key: 'itunes_url', label: 'iTunes URL'},
            {key: 'itunes_img', label: 'iTunes Image'},
            {key: 'itunes_preview', label: 'iTunes Preview'},
            {key: 'itunes_id', label: 'iTunes ID'},
            {key: 'rovi_id', label: 'Rovi ID'},
            {key: 'echo_id', label: 'Echo ID'},
        ]
    },
];
