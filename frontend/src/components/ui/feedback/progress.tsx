'use client'

import {Progress as AntProgress} from 'antd';
import type {ProgressProps as AntProgressProps} from 'antd';
import * as React from 'react';

import {cn} from '@/lib/utils';

// Create a wrapper around Ant Design's Progress component that maintains
// the same API as the original shadcn/ui Progress component

interface ProgressProps extends Omit<AntProgressProps, 'percent'> {
    value?: number;
    className?: string;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
    ({className, value = 0, ...props}, ref) => (
        <div ref={ref} className={cn('w-full', className)}>
            <AntProgress
                percent={value}
                strokeLinecap="round"
                size="small"
                {...props}
            />
        </div>
    )
);
Progress.displayName = 'Progress';

export {Progress};
