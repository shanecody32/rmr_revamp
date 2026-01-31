'use client'

import type {FieldGroup} from './types';

export const FIELD_GROUPS: FieldGroup[] = [
    {
        key: 'basic',
        title: 'Basic Information',
        fields: [
            {key: 'name', label: 'Name'},
            {key: 'slug', label: 'Slug'},
            {key: 'station_type', label: 'Type'},
            {key: 'info', label: 'Info'},
        ]
    },
    {
        key: 'status',
        title: 'Status',
        fields: [
            {key: 'approved', label: 'Approved'},
            {key: 'verified', label: 'Verified'},
            {key: 'automatic', label: 'Automatic'},
            {key: 'active', label: 'Active'},
            {key: 'no_show', label: 'No Show'},
            {key: 'influence', label: 'Influence'},
        ]
    },
];
