'use client'

import {AutoComplete, Divider, Empty, Input, List, Space, Typography} from 'antd';
import type {AutoCompleteProps, InputProps} from 'antd';
import {Search} from 'lucide-react';
import * as React from 'react';

import {Dialog, DialogContent} from '@/components/ui/overlays/dialog';
import {cn} from '@/lib/utils';

// Create wrapper components around Ant Design components
// that maintain a similar API to the original cmdk Command components

const Command = React.forwardRef<
    React.ElementRef<typeof AutoComplete>,
    React.ComponentPropsWithoutRef<typeof AutoComplete>
>(({className, ...props}, ref) => (
    <AutoComplete
        ref={ref}
        className={cn(
            'flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground',
            className
        )}
        {...props}
    />
));
Command.displayName = 'Command';

interface CommandDialogProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    children?: React.ReactNode;
}

const CommandDialog = ({children, ...props}: CommandDialogProps) => {
    return (
        <Dialog {...props}>
            <DialogContent className="overflow-hidden p-0 shadow-lg">
                <div className="command-dialog-container">
                    {children}
                </div>
            </DialogContent>
        </Dialog>
    );
};

const CommandInput = React.forwardRef<
    React.ElementRef<typeof Input>,
    React.ComponentPropsWithoutRef<typeof Input>
>(({className, ...props}, ref) => (
    <div className="flex items-center border-b px-3">
        <Input
            ref={ref}
            prefix={<Search className="mr-2 h-4 w-4 shrink-0 opacity-50"/>}
            className={cn(
                'flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
                className
            )}
            {...props}
        />
    </div>
));

CommandInput.displayName = 'CommandInput';

const CommandList = React.forwardRef<
    React.ElementRef<typeof List>,
    React.ComponentPropsWithoutRef<typeof List>
>(({className, ...props}, ref) => (
    <List
        ref={ref}
        className={cn('max-h-[300px] overflow-y-auto overflow-x-hidden', className)}
        {...props}
    />
));

CommandList.displayName = 'CommandList';

const CommandEmpty = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>((props, ref) => (
    <div ref={ref} className="py-6 text-center text-sm">
        <Empty description={props.children || "No results found"} />
    </div>
));

CommandEmpty.displayName = 'CommandEmpty';

const CommandGroup = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & {
        heading?: React.ReactNode;
    }
>(({className, heading, children, ...props}, ref) => (
    <div
        ref={ref}
        className={cn(
            'overflow-hidden p-1 text-foreground',
            className
        )}
        {...props}
    >
        {heading && (
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                {heading}
            </div>
        )}
        {children}
    </div>
));

CommandGroup.displayName = 'CommandGroup';

const CommandSeparator = React.forwardRef<
    HTMLDivElement,
    React.ComponentPropsWithoutRef<typeof Divider>
>(({className, ...props}, ref) => (
    <div ref={ref}>
        <Divider
            className={cn('-mx-1 h-px bg-border', className)}
            {...props}
        />
    </div>
));
CommandSeparator.displayName = 'CommandSeparator';

const CommandItem = React.forwardRef<
    HTMLLIElement,
    React.LiHTMLAttributes<HTMLLIElement> & {
        disabled?: boolean;
        selected?: boolean;
    }
>(({className, disabled, selected, ...props}, ref) => (
    <li
        ref={ref}
        className={cn(
            "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
            disabled && "pointer-events-none opacity-50",
            selected && "bg-accent text-accent-foreground",
            className
        )}
        aria-disabled={disabled}
        data-selected={selected}
        {...props}
    />
));

CommandItem.displayName = 'CommandItem';

const CommandShortcut = ({
                             className,
                             ...props
                         }: React.HTMLAttributes<HTMLSpanElement>) => {
    return (
        <span
            className={cn(
                'ml-auto text-xs tracking-widest text-muted-foreground',
                className
            )}
            {...props}
        />
    );
};
CommandShortcut.displayName = 'CommandShortcut';

export {
    Command,
    CommandDialog,
    CommandInput,
    CommandList,
    CommandEmpty,
    CommandGroup,
    CommandItem,
    CommandShortcut,
    CommandSeparator,
};
