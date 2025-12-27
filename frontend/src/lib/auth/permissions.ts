import type {UserRole} from '@/types/auth';

export type ResourceAction = 'create' | 'read' | 'update' | 'delete';
export type Resource = 'bands' | 'songs' | 'albums' | 'radio-stations';

export const PERMISSIONS: Record<Resource, Record<ResourceAction, UserRole[]>> = {
    bands: {
        create: ['superadmin', 'admin', 'editor'],
        read: ['superadmin', 'admin', 'editor', 'viewer'],
        update: ['superadmin', 'admin', 'editor'],
        delete: ['superadmin', 'admin']
    },
    songs: {
        create: ['superadmin', 'admin', 'editor'],
        read: ['superadmin', 'admin', 'editor', 'viewer'],
        update: ['superadmin', 'admin', 'editor'],
        delete: ['superadmin', 'admin']
    },
    albums: {
        create: ['superadmin', 'admin', 'editor'],
        read: ['superadmin', 'admin', 'editor', 'viewer'],
        update: ['superadmin', 'admin', 'editor'],
        delete: ['superadmin', 'admin']
    },
    'radio-stations': {
        create: ['superadmin', 'admin'],
        read: ['superadmin', 'admin', 'editor', 'viewer'],
        update: ['superadmin', 'admin'],
        delete: ['superadmin', 'admin']
    }
} as const;

export function hasPermission(userRole: UserRole | undefined, resource: Resource, action: ResourceAction): boolean {
    if (!userRole) return false;
    return PERMISSIONS[resource][action].includes(userRole);
}
