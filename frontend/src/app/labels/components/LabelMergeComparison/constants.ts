'use client'

import type {FieldGroup} from './types';

export const FIELD_GROUPS: FieldGroup[] = [
    {
        key: 'basic',
        title: 'Basic Information',
        fields: [
            {key: 'name', label: 'Name'},
            {key: 'slug', label: 'Slug'},
        ]
    },
];
