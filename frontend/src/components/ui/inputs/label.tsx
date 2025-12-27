'use client'

import * as React from 'react';

import {cn} from '@/lib/utils';

// Create a Label component that maintains the same API as the original Label component
interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
    ({className, ...props}, ref) => (
        <label
            ref={ref}
            className={cn(
                'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
                className
            )}
            {...props}
        />
    )
);
Label.displayName = 'Label';

export {Label};
