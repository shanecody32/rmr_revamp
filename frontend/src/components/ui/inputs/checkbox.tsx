'use client'

import {Checkbox as AntCheckbox} from 'antd';
import type {CheckboxProps as AntCheckboxProps} from 'antd';
import * as React from 'react';

import {cn} from '@/lib/utils';

// Create a type that matches the original Checkbox component's props
type CheckboxProps = Omit<AntCheckboxProps, 'ref'> & {
    ref?: React.Ref<HTMLInputElement>;
};

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
    ({className, ...props}, ref) => (
        <AntCheckbox
            ref={ref as any}
            className={cn(
                // Apply Tailwind classes for compatibility
                'peer rounded-sm',
                className
            )}
            {...props}
        />
    )
);
Checkbox.displayName = 'Checkbox';

export {Checkbox};
