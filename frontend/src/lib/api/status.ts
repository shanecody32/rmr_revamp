'use client'

import type {
    DataStatusUpdate,
    ChartStatusUpdate,
    StatusUpdateResult,
    StatusHistoryEntry,
} from '@/types/api/common';
import { api } from './config';

export type EntityType = 'bands' | 'albums' | 'songs' | 'radio-stations' | 'staff-members';

// ========== Data Status Operations ==========

/**
 * Update an entity's data status.
 */
export const updateDataStatus = async (
    entityType: EntityType,
    entityId: number,
    update: DataStatusUpdate
): Promise<StatusUpdateResult> => {
    const response = await api.put<StatusUpdateResult>(
        `/status/${entityType}/${entityId}/data-status`,
        update
    );
    return response.data;
};

/**
 * Mark an entity as validated (data has been reviewed and is correct).
 */
export const markValidated = async (
    entityType: EntityType,
    entityId: number,
    note?: string
): Promise<StatusUpdateResult> => {
    return updateDataStatus(entityType, entityId, {
        status: 'validated',
        reason: 'manual',
        note,
    });
};

/**
 * Mark an entity as needing review.
 */
export const markNeedsReview = async (
    entityType: EntityType,
    entityId: number,
    reason: string,
    note?: string
): Promise<StatusUpdateResult> => {
    return updateDataStatus(entityType, entityId, {
        status: 'needs_review',
        reason,
        note,
    });
};

// ========== Chart Status Operations ==========

/**
 * Update an entity's chart status.
 */
export const updateChartStatus = async (
    entityType: EntityType,
    entityId: number,
    update: ChartStatusUpdate
): Promise<StatusUpdateResult> => {
    const response = await api.put<StatusUpdateResult>(
        `/status/${entityType}/${entityId}/chart-status`,
        update
    );
    return response.data;
};

/**
 * Approve an entity for charting.
 */
export const approveForCharting = async (
    entityType: EntityType,
    entityId: number,
    note?: string
): Promise<StatusUpdateResult> => {
    return updateChartStatus(entityType, entityId, {
        status: 'approved',
        note,
    });
};

/**
 * Deny an entity from charting.
 */
export const denyFromCharting = async (
    entityType: EntityType,
    entityId: number,
    denialReason: string,
    note?: string
): Promise<StatusUpdateResult> => {
    return updateChartStatus(entityType, entityId, {
        status: 'denied',
        denial_reason: denialReason,
        note,
    });
};

/**
 * Suspend an entity from charting (temporary denial).
 */
export const suspendFromCharting = async (
    entityType: EntityType,
    entityId: number,
    note?: string
): Promise<StatusUpdateResult> => {
    return updateChartStatus(entityType, entityId, {
        status: 'suspended',
        note,
    });
};

// ========== Status History ==========

/**
 * Get the status change history for an entity.
 */
export const getStatusHistory = async (
    entityType: EntityType,
    entityId: number
): Promise<StatusHistoryEntry[]> => {
    const response = await api.get<StatusHistoryEntry[]>(
        `/status/${entityType}/${entityId}/status-history`
    );
    return response.data;
};

// ========== Batch Operations ==========

/**
 * Batch validate multiple entities.
 */
export const batchMarkValidated = async (
    entityType: EntityType,
    entityIds: number[],
    note?: string
): Promise<StatusUpdateResult[]> => {
    const results = await Promise.all(
        entityIds.map(id => markValidated(entityType, id, note))
    );
    return results;
};

/**
 * Batch approve multiple entities for charting.
 */
export const batchApproveForCharting = async (
    entityType: EntityType,
    entityIds: number[],
    note?: string
): Promise<StatusUpdateResult[]> => {
    const results = await Promise.all(
        entityIds.map(id => approveForCharting(entityType, id, note))
    );
    return results;
};
