'use client'

import {Breadcrumb as AntBreadcrumb} from 'antd';
import type {BreadcrumbProps as AntBreadcrumbProps, BreadcrumbItemType} from 'antd/es/breadcrumb/Breadcrumb';
import Link from 'next/link';
import * as React from 'react';

import {cn} from '@/lib/utils';

// Create a wrapper around Ant Design's Breadcrumb component
// that maintains a similar API to the original shadcn/ui Breadcrumb component

export interface BreadcrumbProps extends Omit<AntBreadcrumbProps, 'items'> {
    className?: string;
    items?: BreadcrumbItem[];
}

export interface BreadcrumbItem {
    href?: string;
    label: React.ReactNode;
    active?: boolean;
}

const Breadcrumb = React.forwardRef<HTMLDivElement, BreadcrumbProps>(
    ({className, items = [], ...props}, ref) => {
        // Convert our items format to Ant Design's format
        const antItems: BreadcrumbItemType[] = items.map((item) => ({
            title: item.href && !item.active ? (
                <Link href={item.href}>{item.label}</Link>
            ) : (
                <span className={item.active ? 'font-semibold' : ''}>{item.label}</span>
            ),
        }));

        return (
            <div ref={ref}>
                <AntBreadcrumb
                    className={cn('mb-4', className)}
                    items={antItems}
                    {...props}
                />
            </div>
        );
    }
);
Breadcrumb.displayName = 'Breadcrumb';

// BreadcrumbItem component for individual items
const BreadcrumbItem = React.forwardRef<HTMLSpanElement, BreadcrumbItem>(
    ({href, label, active, ...props}, ref) => {
        return (
            <span ref={ref} {...props}>
                {href && !active ? (
                    <Link href={href}>{label}</Link>
                ) : (
                    <span className={active ? 'font-semibold' : ''}>{label}</span>
                )}
            </span>
        );
    }
);
BreadcrumbItem.displayName = 'BreadcrumbItem';

export {Breadcrumb, BreadcrumbItem};
