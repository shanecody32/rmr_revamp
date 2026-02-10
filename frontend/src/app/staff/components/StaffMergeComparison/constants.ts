'use client'

import type {FieldGroup} from './types';

export const STAFF_FIELD_GROUPS: FieldGroup[] = [
    {
        key: 'basic',
        title: 'Basic Information',
        fields: [
            {key: 'first_name', label: 'First Name'},
            {key: 'last_name', label: 'Last Name'},
            {key: 'on_air_name', label: 'On-Air Name'},
        ],
    },
    {
        key: 'contact',
        title: 'Contact & Show',
        fields: [
            {key: 'email', label: 'Email'},
            {key: 'position', label: 'Position'},
            {key: 'show_name', label: 'Show Name'},
            {key: 'bio', label: 'Biography'},
            {key: 'show_description', label: 'Show Description'},
        ],
    },
];
