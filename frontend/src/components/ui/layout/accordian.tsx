'use client'

import {Collapse} from 'antd';
import type {CollapseProps} from 'antd';
import {ChevronDown} from 'lucide-react';
import * as React from 'react';

import {cn} from '@/lib/utils';

// Create a wrapper around Ant Design's Collapse component
// that maintains a similar API to the original Accordion component

const Accordion = React.forwardRef<
    HTMLDivElement,
    Omit<CollapseProps, 'expandIcon'> & {
        type?: 'single' | 'multiple';
        collapsible?: boolean;
    }
>(({className, children, type = 'single', collapsible, ...props}, ref) => {
    // Convert type to accordion prop
    const accordion = type === 'single';

    return (
        <Collapse
            accordion={accordion}
            expandIcon={({isActive}) => (
                <ChevronDown 
                    className={cn(
                        "h-4 w-4 shrink-0 transition-transform duration-200",
                        isActive && "rotate-180"
                    )}
                />
            )}
            className={cn('border-b', className)}
            {...props}
            ref={ref}
        >
            {children}
        </Collapse>
    );
});
Accordion.displayName = 'Accordion';

// Use Collapse.Panel as AccordionItem
const AccordionItem = React.forwardRef<
    React.ElementRef<typeof Collapse.Panel>,
    React.ComponentPropsWithoutRef<typeof Collapse.Panel>
>(({className, ...props}, ref) => (
    <Collapse.Panel
        className={cn('border-b', className)}
        {...props}
    />
));
AccordionItem.displayName = 'AccordionItem';

// These components are kept for API compatibility but don't do anything
const AccordionTrigger = ({children}: {children: React.ReactNode}) => <>{children}</>;
AccordionTrigger.displayName = 'AccordionTrigger';

const AccordionContent = ({children, className}: {children: React.ReactNode, className?: string}) => (
    <div className={cn('pb-4 pt-0', className)}>{children}</div>
);
AccordionContent.displayName = 'AccordionContent';

export {Accordion, AccordionItem, AccordionTrigger, AccordionContent};
