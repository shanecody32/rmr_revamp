'use client'

import {Select as AntSelect} from 'antd';
import type {SelectProps as AntSelectProps} from 'antd';
import {Check, ChevronDown, ChevronUp} from 'lucide-react';
import * as React from 'react';

import {cn} from '@/lib/utils';

// Create a wrapper around Ant Design's Select component that maintains the same API
// as the original shadcn/ui Select component

// Main Select component
interface SelectProps extends Omit<AntSelectProps, 'children'> {
    children?: React.ReactNode;
}

const Select = ({children, ...props}: SelectProps) => {
    // Extract options from children if provided
    const options = React.Children.toArray(children)
        .filter((child) => React.isValidElement(child) && child.type === SelectItem)
        .map((child) => {
            if (React.isValidElement(child)) {
                const childProps = child.props as { value?: string; children?: React.ReactNode; disabled?: boolean };
                const {value, children, disabled} = childProps;
                return {
                    value,
                    label: children,
                    disabled,
                };
            }
            return null;
        })
        .filter((option): option is NonNullable<typeof option> => option !== null);

    return <AntSelect {...props} options={options.length > 0 ? options : props.options} />;
};

// SelectGroup component (maps to Ant Design's OptGroup)
interface SelectGroupProps {
    label?: string;
    children?: React.ReactNode;
}

const SelectGroup = ({label, children}: SelectGroupProps) => {
    // This is just a placeholder component for compatibility
    // Ant Design's Select handles groups differently
    return <AntSelect.OptGroup label={label}>{children}</AntSelect.OptGroup>;
};

// SelectValue component (not needed in Ant Design, but kept for compatibility)
const SelectValue = ({children}: {children?: React.ReactNode}) => {
    // This is just a placeholder component for compatibility
    return <>{children}</>;
};

// SelectTrigger component (maps to Ant Design's Select with custom rendering)
interface SelectTriggerProps extends React.HTMLAttributes<HTMLDivElement> {
    children?: React.ReactNode;
}

const SelectTrigger = React.forwardRef<HTMLDivElement, SelectTriggerProps>(
    ({className, children, ...props}, ref) => {
        // This is just a placeholder component for compatibility
        return (
            <div
                ref={ref}
                className={cn(
                    'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm',
                    className
                )}
                {...props}
            >
                {children}
                <ChevronDown className="h-4 w-4 opacity-50"/>
            </div>
        );
    }
);
SelectTrigger.displayName = 'SelectTrigger';

// Placeholder components for compatibility
const SelectScrollUpButton = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({className, ...props}, ref) => (
        <div
            ref={ref}
            className={cn('flex cursor-default items-center justify-center py-1', className)}
            {...props}
        >
            <ChevronUp className="h-4 w-4"/>
        </div>
    )
);
SelectScrollUpButton.displayName = 'SelectScrollUpButton';

const SelectScrollDownButton = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({className, ...props}, ref) => (
        <div
            ref={ref}
            className={cn('flex cursor-default items-center justify-center py-1', className)}
            {...props}
        >
            <ChevronDown className="h-4 w-4"/>
        </div>
    )
);
SelectScrollDownButton.displayName = 'SelectScrollDownButton';

// SelectContent component (not needed in Ant Design, but kept for compatibility)
interface SelectContentProps extends React.HTMLAttributes<HTMLDivElement> {
    position?: 'popper' | 'item-aligned';
    children?: React.ReactNode;
}

const SelectContent = React.forwardRef<HTMLDivElement, SelectContentProps>(
    ({className, children, position = 'popper', ...props}, ref) => {
        // This is just a placeholder component for compatibility
        return (
            <div
                ref={ref}
                className={cn(
                    'relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover shadow-md',
                    className
                )}
                {...props}
            >
                {children}
            </div>
        );
    }
);
SelectContent.displayName = 'SelectContent';

// SelectLabel component (maps to Ant Design's Option.Label)
interface SelectLabelProps extends React.HTMLAttributes<HTMLDivElement> {
    children?: React.ReactNode;
}

const SelectLabel = React.forwardRef<HTMLDivElement, SelectLabelProps>(
    ({className, ...props}, ref) => {
        // This is just a placeholder component for compatibility
        return (
            <div
                ref={ref}
                className={cn('py-1.5 pl-8 pr-2 text-sm font-semibold', className)}
                {...props}
            />
        );
    }
);
SelectLabel.displayName = 'SelectLabel';

// SelectItem component (maps to Ant Design's Option)
interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
    value: string | number;
    disabled?: boolean;
    children?: React.ReactNode;
}

const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
    ({className, children, ...props}, ref) => {
        // This component is used to extract options for the Select component
        // It doesn't render anything on its own
        return (
            <div
                ref={ref}
                className={cn(
                    'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm',
                    className
                )}
                {...props}
            >
                {children}
            </div>
        );
    }
);
SelectItem.displayName = 'SelectItem';

// SelectSeparator component (maps to Ant Design's Divider)
interface SelectSeparatorProps extends React.HTMLAttributes<HTMLDivElement> {}

const SelectSeparator = React.forwardRef<HTMLDivElement, SelectSeparatorProps>(
    ({className, ...props}, ref) => {
        // This is just a placeholder component for compatibility
        return (
            <div
                ref={ref}
                className={cn('-mx-1 my-1 h-px bg-muted', className)}
                {...props}
            />
        );
    }
);
SelectSeparator.displayName = 'SelectSeparator';

export {
    Select,
    SelectGroup,
    SelectValue,
    SelectTrigger,
    SelectContent,
    SelectLabel,
    SelectItem,
    SelectSeparator,
    SelectScrollUpButton,
    SelectScrollDownButton,
};
