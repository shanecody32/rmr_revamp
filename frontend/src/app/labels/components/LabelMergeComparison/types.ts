'use client'

import type {LabelResponse} from '@/types/api/labels';

export interface LabelComparisonItem {
    id: number;
    name: string;
    data: LabelResponse;
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
