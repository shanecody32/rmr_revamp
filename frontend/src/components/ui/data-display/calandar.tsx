'use client'

import {Calendar as AntCalendar} from 'antd';
import type {CalendarProps as AntCalendarProps} from 'antd';
import type {Dayjs} from 'dayjs';
import * as React from 'react';

import {cn} from '@/lib/utils';

// Create a wrapper around Ant Design's Calendar component
// that maintains the same API as the original shadcn/ui Calendar component

// Define the props type for our Calendar component
// We'll extend Ant Design's CalendarProps and add any additional props needed for compatibility
export interface CalendarProps extends Omit<AntCalendarProps<Dayjs>, 'fullscreen'> {
    className?: string;
    classNames?: Record<string, string>;
    showOutsideDays?: boolean;
    // Add any other props from the original component that aren't in AntCalendarProps
}

function Calendar({
                      className,
                      classNames,
                      showOutsideDays = true,
                      ...props
                  }: CalendarProps) {
    // Map showOutsideDays to Ant Design's fullscreen prop (inverse logic)
    // In Ant Design, fullscreen=false shows a smaller calendar similar to a date picker
    const fullscreen = false;

    return (
        <div className={cn('p-3', className)}>
            <AntCalendar
                fullscreen={fullscreen}
                // Map other props as needed
                {...props}
            />
        </div>
    );
}

Calendar.displayName = 'Calendar';

export {Calendar};
