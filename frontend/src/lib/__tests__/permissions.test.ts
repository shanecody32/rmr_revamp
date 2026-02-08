import { describe, it, expect } from 'vitest';
import { hasPermission, PERMISSIONS, type Resource, type ResourceAction } from '../auth/permissions';
import type { UserRole } from '@/types/auth';

describe('hasPermission', () => {
    it('superadmin has all permissions on all resources', () => {
        const resources: Resource[] = ['bands', 'songs', 'albums', 'radio-stations'];
        const actions: ResourceAction[] = ['create', 'read', 'update', 'delete'];

        for (const resource of resources) {
            for (const action of actions) {
                expect(hasPermission('superadmin', resource, action)).toBe(true);
            }
        }
    });

    it('viewer can only read', () => {
        expect(hasPermission('viewer', 'bands', 'read')).toBe(true);
        expect(hasPermission('viewer', 'bands', 'create')).toBe(false);
        expect(hasPermission('viewer', 'bands', 'update')).toBe(false);
        expect(hasPermission('viewer', 'bands', 'delete')).toBe(false);
    });

    it('editor can CRUD bands but NOT delete', () => {
        expect(hasPermission('editor', 'bands', 'create')).toBe(true);
        expect(hasPermission('editor', 'bands', 'read')).toBe(true);
        expect(hasPermission('editor', 'bands', 'update')).toBe(true);
        expect(hasPermission('editor', 'bands', 'delete')).toBe(false);
    });

    it('editor cannot create or update radio-stations', () => {
        expect(hasPermission('editor', 'radio-stations', 'create')).toBe(false);
        expect(hasPermission('editor', 'radio-stations', 'update')).toBe(false);
        expect(hasPermission('editor', 'radio-stations', 'read')).toBe(true);
    });

    it('admin has full access to everything including radio-stations', () => {
        const resources: Resource[] = ['bands', 'songs', 'albums', 'radio-stations'];
        const actions: ResourceAction[] = ['create', 'read', 'update', 'delete'];

        for (const resource of resources) {
            for (const action of actions) {
                expect(hasPermission('admin', resource, action)).toBe(true);
            }
        }
    });

    it('undefined role returns false for all', () => {
        expect(hasPermission(undefined, 'bands', 'read')).toBe(false);
        expect(hasPermission(undefined, 'bands', 'create')).toBe(false);
        expect(hasPermission(undefined, 'albums', 'delete')).toBe(false);
    });

    it('every resource has all 4 actions defined', () => {
        const resources: Resource[] = ['bands', 'songs', 'albums', 'radio-stations'];
        const actions: ResourceAction[] = ['create', 'read', 'update', 'delete'];

        for (const resource of resources) {
            for (const action of actions) {
                expect(PERMISSIONS[resource][action]).toBeDefined();
                expect(Array.isArray(PERMISSIONS[resource][action])).toBe(true);
                expect(PERMISSIONS[resource][action].length).toBeGreaterThan(0);
            }
        }
    });

    it('viewer can read all resources', () => {
        const resources: Resource[] = ['bands', 'songs', 'albums', 'radio-stations'];
        for (const resource of resources) {
            expect(hasPermission('viewer', resource, 'read')).toBe(true);
        }
    });

    it('editor can CRUD songs and albums but not delete', () => {
        for (const resource of ['songs', 'albums'] as Resource[]) {
            expect(hasPermission('editor', resource, 'create')).toBe(true);
            expect(hasPermission('editor', resource, 'read')).toBe(true);
            expect(hasPermission('editor', resource, 'update')).toBe(true);
            expect(hasPermission('editor', resource, 'delete')).toBe(false);
        }
    });

    it('admin can delete all resources', () => {
        const resources: Resource[] = ['bands', 'songs', 'albums', 'radio-stations'];
        for (const resource of resources) {
            expect(hasPermission('admin', resource, 'delete')).toBe(true);
        }
    });

    it('editor cannot delete any resource', () => {
        const resources: Resource[] = ['bands', 'songs', 'albums', 'radio-stations'];
        for (const resource of resources) {
            expect(hasPermission('editor', resource, 'delete')).toBe(false);
        }
    });

    it('viewer cannot create, update, or delete anything', () => {
        const resources: Resource[] = ['bands', 'songs', 'albums', 'radio-stations'];
        for (const resource of resources) {
            expect(hasPermission('viewer', resource, 'create')).toBe(false);
            expect(hasPermission('viewer', resource, 'update')).toBe(false);
            expect(hasPermission('viewer', resource, 'delete')).toBe(false);
        }
    });
});
