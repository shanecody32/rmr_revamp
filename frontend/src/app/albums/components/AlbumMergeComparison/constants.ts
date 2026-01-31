'use client'

import type {FieldGroup} from './types';

export const FIELD_GROUPS: FieldGroup[] = [
    {
        key: 'basic',
        title: 'Basic Information',
        fields: [
            {key: 'name', label: 'Name'},
            {key: 'slug', label: 'Slug'},
            {key: 'release_date', label: 'Release Date'},
            {key: 'label_id', label: 'Label'},
        ]
    },
    {
        key: 'details',
        title: 'Details',
        fields: [
            {key: 'about', label: 'About'},
            {key: 'thanks', label: 'Thanks'},
            {key: 'producer', label: 'Producer'},
            {key: 'engineer', label: 'Engineer'},
            {key: 'studio', label: 'Studio'},
            {key: 'master', label: 'Master'},
        ]
    },
    {
        key: 'external',
        title: 'External IDs',
        fields: [
            {key: 'itunes_url', label: 'iTunes URL'},
            {key: 'itunes_id', label: 'iTunes ID'},
            {key: 'cdbaby_url', label: 'CD Baby URL'},
            {key: 'amazon_url', label: 'Amazon URL'},
            {key: 'rovi_id', label: 'Rovi ID'},
        ]
    },
    {
        key: 'classification',
        title: 'Classification',
        fields: [
            {key: 'sub_genre_for_charting', label: 'Sub-Genre for Charting'},
            {key: 'compilation', label: 'Compilation'},
            {key: 'soundtrack', label: 'Soundtrack'},
        ]
    },
];
