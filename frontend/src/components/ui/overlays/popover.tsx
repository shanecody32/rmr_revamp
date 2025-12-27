'use client'

import {Popover as AntPopover} from 'antd';
import type {PopoverProps as AntPopoverProps} from 'antd';
import * as React from 'react';

import {cn} from '@/lib/utils';

// Simple wrapper approach for Popover component

// Define props that match the original component's API
interface PopoverProps {
    open?: boolean;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    children?: React.ReactNode;
}

// Since Ant Design Popover works differently than Radix UI,
// we'll create a simpler wrapper that maintains compatibility
const Popover = React.forwardRef<HTMLDivElement, PopoverProps>((props, ref) => {
    // Pass through to children since we'll handle the logic in a combined component
    return <div ref={ref}>{props.children}</div>;
});
Popover.displayName = 'Popover';

// Trigger component - just passes through children
interface PopoverTriggerProps {
    asChild?: boolean;
    children?: React.ReactNode;
}

const PopoverTrigger = React.forwardRef<HTMLButtonElement, PopoverTriggerProps>(
    ({ asChild, children, ...props }, ref) => {
        // For Ant Design, the trigger is the direct child of Popover
        // So we just pass through the children
        if (asChild && React.isValidElement(children)) {
            return React.cloneElement(children as React.ReactElement<any>, { ...props });
        }
        return <button ref={ref} {...props}>{children}</button>;
    }
);
PopoverTrigger.displayName = 'PopoverTrigger';

// Content component
interface PopoverContentProps extends Omit<AntPopoverProps, 'open' | 'trigger' | 'align' | 'content'> {
    className?: string;
    align?: 'start' | 'center' | 'end';
    sideOffset?: number;
    children?: React.ReactNode;
}

// This is a higher-order component that wraps the trigger and content together
const PopoverContent = React.forwardRef<HTMLDivElement, PopoverContentProps>(
    ({ className, align = 'center', sideOffset = 4, children, placement, ...props }, ref) => {
        // Since we need both trigger and content together for Ant Design,
        // we'll look for them in the parent Popover's children
        const parent = React.useContext(PopoverContext);
        
        if (!parent) {
            // Fallback: just render the content
            return (
                <div 
                    ref={ref}
                    className={cn(
                        'z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none',
                        className
                    )}
                >
                    {children}
                </div>
            );
        }

        // Map align values to Ant Design placement
        const getPlacement = () => {
            if (placement) return placement;
            switch (align) {
                case 'start':
                    return 'topLeft';
                case 'end':
                    return 'topRight';
                case 'center':
                default:
                    return 'top';
            }
        };

        return (
            <AntPopover
                open={parent.open}
                onOpenChange={parent.setOpen}
                placement={getPlacement()}
                content={
                    <div 
                        ref={ref}
                        className={cn(
                            'z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none',
                            className
                        )}
                    >
                        {children}
                    </div>
                }
                trigger="click"
                overlayStyle={{ paddingTop: sideOffset }}
                {...props}
            >
                {parent.trigger}
            </AntPopover>
        );
    }
);
PopoverContent.displayName = 'PopoverContent';

// Create a context for the combined component approach
interface PopoverContextType {
    open?: boolean;
    setOpen?: (open: boolean) => void;
    trigger?: React.ReactNode;
}

const PopoverContext = React.createContext<PopoverContextType | null>(null);

// Alternative: Combined component for simpler usage
interface PopoverCombinedProps extends PopoverContentProps {
    trigger: React.ReactNode;
    open?: boolean;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
}

const PopoverCombined = React.forwardRef<HTMLDivElement, PopoverCombinedProps>(
    ({ trigger, children, className, align = 'center', sideOffset = 4, open: controlledOpen, defaultOpen = false, onOpenChange, placement, ...props }, ref) => {
        const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
        const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;

        const setOpen = React.useCallback((newOpen: boolean) => {
            setUncontrolledOpen(newOpen);
            onOpenChange?.(newOpen);
        }, [onOpenChange]);

        // Map align values to Ant Design placement
        const getPlacement = () => {
            if (placement) return placement;
            switch (align) {
                case 'start':
                    return 'topLeft';
                case 'end':
                    return 'topRight';
                case 'center':
                default:
                    return 'top';
            }
        };

        return (
            <AntPopover
                open={open}
                onOpenChange={setOpen}
                placement={getPlacement()}
                content={
                    <div 
                        ref={ref}
                        className={cn(
                            'z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none',
                            className
                        )}
                    >
                        {children}
                    </div>
                }
                trigger="click"
                overlayStyle={{ paddingTop: sideOffset }}
                {...props}
            >
                {trigger}
            </AntPopover>
        );
    }
);
PopoverCombined.displayName = 'PopoverCombined';

export {Popover, PopoverTrigger, PopoverContent, PopoverCombined};