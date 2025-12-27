'use client'

import {Badge as AntBadge} from 'antd';
import type {BadgeProps as AntBadgeProps} from 'antd';
import * as React from 'react';

import {cn} from '@/lib/utils';

// Create a wrapper around Ant Design's Badge component that maintains
// the same API as the original shadcn/ui Badge component

// Define the variants for the badge
const badgeVariants = {
    default: {
        color: 'blue',
    },
    secondary: {
        color: 'purple',
    },
    destructive: {
        color: 'red',
    },
    outline: {
        color: 'default',
    },
};

export interface BadgeProps extends Omit<AntBadgeProps, 'status' | 'color'> {
    variant?: keyof typeof badgeVariants;
    className?: string;
}

function Badge({className, variant = 'default', children, ...props}: BadgeProps) {
    // Map shadcn/ui variants to Ant Design colors
    const color = badgeVariants[variant]?.color;

    return (
        <AntBadge
            className={cn('inline-flex items-center', className)}
            color={color as any}
            count={children}
            {...props}
        />
    );
}

export {Badge, badgeVariants};
