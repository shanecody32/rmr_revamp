'use client'

import type {AlbumWithRelationsResponse} from '@/types/api/albums';

export interface AlbumComparisonItem {
    id: number;
    name: string;
    data: AlbumWithRelationsResponse;
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
