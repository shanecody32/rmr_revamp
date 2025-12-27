'use client'

import {useAuth} from '@/contexts/AuthContext';
import type {Resource, ResourceAction} from '@/lib/auth/permissions';
import {hasPermission} from '@/lib/auth/permissions';

export function usePermission(resource: Resource, action: ResourceAction) {
    const {user} = useAuth();
    return hasPermission(user?.role, resource, action);
}
