'use client'

import type {RadioStationResponse} from '@/types/api/radio-stations';

export interface RadioStationComparisonItem {
    id: number;
    name: string;
    data: RadioStationResponse;
    loading: boolean;
    error: string | null;
}

export type MergeFieldValue = {
    value: any;
    sourceId: number;
};

export interface FieldDefinition {
    key: string;
    label: string;
    special?: string;
}

export interface FieldGroup {
    key: string;
    title: string;
    fields: FieldDefinition[];
}
