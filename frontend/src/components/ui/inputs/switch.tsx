'use client'

import {Switch as AntSwitch} from 'antd';
import type {SwitchProps} from 'antd';
import * as React from 'react';

import {cn} from '@/lib/utils';

const Switch = React.forwardRef<
    React.ElementRef<typeof AntSwitch>,
    React.ComponentPropsWithoutRef<typeof AntSwitch>
>(({className, ...props}, ref) => (
    <AntSwitch
        className={cn(
            'peer inline-flex cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
            className
        )}
        {...props}
        ref={ref}
    />
));
Switch.displayName = 'Switch';

export {Switch};
