'use client'

import {Radio} from 'antd';
import type {RadioGroupProps as AntRadioGroupProps, RadioProps as AntRadioProps} from 'antd';
import * as React from 'react';

import {cn} from '@/lib/utils';

// Create a wrapper around Ant Design's Radio.Group component
interface RadioGroupProps extends Omit<AntRadioGroupProps, 'ref'> {
    className?: string;
    ref?: React.Ref<HTMLDivElement>;
}

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
    ({className, ...props}, ref) => {
        return (
            <Radio.Group
                className={cn('grid gap-2', className)}
                {...props}
                ref={ref as any}
            />
        );
    }
);
RadioGroup.displayName = 'RadioGroup';

// Create a wrapper around Ant Design's Radio component
interface RadioGroupItemProps extends Omit<AntRadioProps, 'ref'> {
    className?: string;
    ref?: React.Ref<HTMLInputElement>;
}

const RadioGroupItem = React.forwardRef<HTMLInputElement, RadioGroupItemProps>(
    ({className, children, ...props}, ref) => {
        return (
            <Radio
                ref={ref as any}
                className={cn(
                    'text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                    className
                )}
                {...props}
            >
                {children}
            </Radio>
        );
    }
);
RadioGroupItem.displayName = 'RadioGroupItem';

export {RadioGroup, RadioGroupItem};
