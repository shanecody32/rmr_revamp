'use client'

import type {FieldGroup} from './types';

export const FIELD_GROUPS: FieldGroup[] = [
    {
        key: 'basic',
        title: 'Basic Information',
        fields: [
            {key: 'name', label: 'Name'},
            {key: 'bio', label: 'Biography'},
        ]
    },
    {
        key: 'location',
        title: 'Location',
        fields: [
            {key: 'location_display', label: 'Location', special: 'location'},
            {key: 'country_id', label: 'Country ID', hidden: true},
            {key: 'state_id', label: 'State ID', hidden: true},
            {key: 'city_id', label: 'City ID', hidden: true},
        ]
    },
    {
        key: 'contact',
        title: 'Contact Information',
        fields: [
            {key: 'website', label: 'Website'},
            {key: 'email', label: 'Email'},
        ]
    },
    {
        key: 'social',
        title: 'Social Media',
        fields: [
            {key: 'facebook_url', label: 'Facebook URL'},
            {key: 'twitter', label: 'Twitter Username'},
            {key: 'instagram_url', label: 'Instagram URL'},
            {key: 'youtube_url', label: 'YouTube URL'},
            {key: 'lastfm_url', label: 'Last.fm URL'},
            {key: 'reverb_url', label: 'Reverb URL'},
            {key: 'wikipedia_url', label: 'Wikipedia URL'},
            {key: 'myspace_url', label: 'MySpace URL'},
            {key: 'cdbaby_url', label: 'CD Baby URL'},
            {key: 'pinterest_url', label: 'Pinterest URL'},
        ]
    },
    {
        key: 'ids',
        title: 'External IDs',
        fields: [
            {key: 'spotify_id', label: 'Spotify ID'},
            {key: 'itunes_id', label: 'iTunes ID'},
            {key: 'amg_id', label: 'AMG ID'},
            {key: 'rovi_id', label: 'Rovi ID'},
            {key: 'echo_id', label: 'Echo ID'},
            {key: 'seven_digital_id', label: '7digital ID'},
            {key: 'discogs_id', label: 'Discogs ID'},
            {key: 'rdio_id', label: 'Rdio ID'},
        ]
    },
    {
        key: 'status',
        title: 'Status',
        fields: [
            {key: 'verified', label: 'Verified'},
            {key: 'approved', label: 'Approved'},
        ]
    }
];