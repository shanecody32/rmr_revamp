'use client'

import type {StaffDetailView} from '@/types/api/staff';

export interface StaffComparisonItem {
    id: number;
    name: string;
    data: StaffDetailView;
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
}

export interface FieldGroup {
    key: string;
    title: string;
    fields: FieldDefinition[];
}
