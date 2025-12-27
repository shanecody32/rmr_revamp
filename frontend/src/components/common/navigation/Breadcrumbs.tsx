'use client'

import {HomeOutlined} from '@ant-design/icons';
import {Breadcrumb} from 'antd';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import React, {useMemo, useEffect, useState} from 'react';


export interface BreadcrumbItem {
    href: string;
    label: string | React.ReactNode;
    active?: boolean;
}

interface BreadcrumbsProps {
    items?: BreadcrumbItem[];
    entityName?: string;
    actionName?: string;
    entityId?: string | number;
    entitySlug?: string;
}

export default function Breadcrumbs({
                                        items,
                                        entityName,
                                        actionName,
                                        entityId,
                                        entitySlug
                                    }: BreadcrumbsProps) {
    const pathname = usePathname();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Dynamically generate breadcrumb items if not provided
    const breadcrumbItems = useMemo(() => {
        if (items) return items;

        // Default item is always Home
        const defaultItems: BreadcrumbItem[] = [
            {href: '/', label: <><HomeOutlined/> Home</>}
        ];

        // Handle case where pathname is not available (SSR/initial render) or component not mounted
        if (!isMounted || !pathname) return defaultItems;

        // If we just have a simple path, parse it
        if (!entityName && !actionName) {
            const pathSegments = pathname.split('/').filter(Boolean);

            return pathSegments.reduce((acc, segment, index) => {
                // Skip empty or invalid segments
                if (!segment || typeof segment !== 'string') {
                    return acc;
                }
                
                // Skip ID and slug segments which are typically parameters
                if (segment.match(/^\d+$/) || segment.includes('-')) {
                    return acc;
                }

                // Capitalize first letter and add spaces between words
                const label = (segment || '')
                    .replace(/-/g, ' ')
                    .replace(/\b\w/g, c => c.toUpperCase());

                const href = `/${pathSegments.slice(0, index + 1).join('/')}`;

                acc.push({href, label, active: index === pathSegments.length - 1});
                return acc;
            }, defaultItems);
        }

        // Handle entity pages (view/edit/etc.)
        if (entityName) {
            // Add the entity type (e.g., "Bands")
            const entityNameCapitalized = entityName.charAt(0).toUpperCase() + entityName.slice(1);
            defaultItems.push({href: `/${entityName}`, label: entityNameCapitalized});

            // Add the action if present (e.g., "Edit" or "View")
            if (actionName) {
                const actionNameCapitalized = actionName.charAt(0).toUpperCase() + actionName.slice(1);

                // For view/edit with ID, add a "Viewing/Editing: Entity Name" breadcrumb
                if (entityId && entitySlug) {
                    defaultItems.push({
                        href: `/${entityName}/${actionName}/${entityId}/${entitySlug}`,
                        label: `${actionNameCapitalized}: ${entitySlug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}`,
                        active: true
                    });
                } else {
                    // Generic action without specific entity
                    defaultItems.push({
                        href: `/${entityName}/${actionName}`,
                        label: actionNameCapitalized,
                        active: true
                    });
                }
            }
        }

        return defaultItems;
    }, [isMounted, pathname, items, entityName, actionName, entityId, entitySlug]);

    return (
        <Breadcrumb
            className="mb-4"
            items={breadcrumbItems.map((item, _index) => ({
                title: item.active ? (
                    <span className="font-semibold">{item.label}</span>
                ) : (
                    <Link href={item.href}>{item.label}</Link>
                )
            }))}
        />
    );
}
