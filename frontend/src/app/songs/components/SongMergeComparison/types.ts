'use client'

import type {SongResponse} from '@/types/api/songs';

export interface SongComparisonItem {
    id: number;
    name: string;
    data: SongResponse;
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
