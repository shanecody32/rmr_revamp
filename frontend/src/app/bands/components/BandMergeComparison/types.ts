'use client'

import type {BandWithDiscographyResponse} from '@/types/api/bands';

export interface BandComparisonItem {
    id: number;
    name: string;
    data: BandWithDiscographyResponse;
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
    hidden?: boolean;
}

export interface FieldGroup {
    key: string;
    title: string;
    fields: FieldDefinition[];
}