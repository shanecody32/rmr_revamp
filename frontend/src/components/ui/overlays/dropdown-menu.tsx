'use client'

import {Dropdown, Menu, Divider} from 'antd';
import type {DropdownProps, MenuProps, MenuItemProps} from 'antd';
import {Check, ChevronRight, Circle} from 'lucide-react';
import * as React from 'react';

import {cn} from '@/lib/utils';

// Create wrapper components around Ant Design's Dropdown component
// that maintain a similar API to the original Radix UI DropdownMenu components

interface DropdownMenuProps {
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({
  children,
  open,
  onOpenChange,
  defaultOpen,
}) => {
  return <>{children}</>;
};
DropdownMenu.displayName = 'DropdownMenu';

// Trigger component
interface DropdownMenuTriggerProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
  children?: React.ReactNode;
}

const DropdownMenuTrigger = React.forwardRef<HTMLDivElement, DropdownMenuTriggerProps>(
  ({className, children, ...props}, ref) => (
    <div
      ref={ref}
      className={cn('inline-flex', className)}
      {...props}
    >
      {children}
    </div>
  )
);
DropdownMenuTrigger.displayName = 'DropdownMenuTrigger';

// Content component
interface DropdownMenuContentProps extends Omit<MenuProps, 'ref'> {
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  alignOffset?: number;
  children?: React.ReactNode;
}

const DropdownMenuContent = React.forwardRef<HTMLDivElement, DropdownMenuContentProps>(
  ({className, children, sideOffset = 4, ...props}, ref) => (
    <div ref={ref}>
      <Menu
        className={cn(
          'z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md',
          className
        )}
        {...props}
      >
        {children}
      </Menu>
    </div>
  )
);
DropdownMenuContent.displayName = 'DropdownMenuContent';

// Item component
interface DropdownMenuItemProps extends Omit<MenuItemProps, 'className'> {
  inset?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const DropdownMenuItem = React.forwardRef<HTMLDivElement, DropdownMenuItemProps>(
  ({className, inset, disabled, children, ...props}, ref) => (
    <Menu.Item
      disabled={disabled}
      className={cn(
        'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        inset && 'pl-8',
        className
      )}
      {...props}
    >
      {children}
    </Menu.Item>
  )
);
DropdownMenuItem.displayName = 'DropdownMenuItem';

// Checkbox item component
interface DropdownMenuCheckboxItemProps extends Omit<MenuItemProps, 'className'> {
  checked?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const DropdownMenuCheckboxItem = React.forwardRef<HTMLDivElement, DropdownMenuCheckboxItemProps>(
  ({className, children, checked, disabled, ...props}, ref) => (
    <Menu.Item
      disabled={disabled}
      className={cn(
        'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className
      )}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        {checked && <Check className="h-4 w-4" />}
      </span>
      {children}
    </Menu.Item>
  )
);
DropdownMenuCheckboxItem.displayName = 'DropdownMenuCheckboxItem';

// Radio group component
const DropdownMenuRadioGroup: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className={cn('', className)} {...props}>
    {children}
  </div>
);
DropdownMenuRadioGroup.displayName = 'DropdownMenuRadioGroup';

// Radio item component
interface DropdownMenuRadioItemProps extends Omit<MenuItemProps, 'className'> {
  checked?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const DropdownMenuRadioItem = React.forwardRef<HTMLDivElement, DropdownMenuRadioItemProps>(
  ({className, children, checked, disabled, ...props}, ref) => (
    <Menu.Item
      disabled={disabled}
      className={cn(
        'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className
      )}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        {checked && <Circle className="h-2 w-2 fill-current" />}
      </span>
      {children}
    </Menu.Item>
  )
);
DropdownMenuRadioItem.displayName = 'DropdownMenuRadioItem';

// Label component
interface DropdownMenuLabelProps extends React.HTMLAttributes<HTMLDivElement> {
  inset?: boolean;
  children?: React.ReactNode;
}

const DropdownMenuLabel = React.forwardRef<HTMLDivElement, DropdownMenuLabelProps>(
  ({className, inset, children, ...props}, ref) => (
    <div
      ref={ref}
      className={cn(
        'px-2 py-1.5 text-sm font-semibold',
        inset && 'pl-8',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
DropdownMenuLabel.displayName = 'DropdownMenuLabel';

// Separator component
const DropdownMenuSeparator = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof Divider>
>(({className, ...props}, ref) => (
  <div ref={ref}>
    <Divider
      className={cn('-mx-1 my-1 h-px bg-muted', className)}
      {...props}
    />
  </div>
));
DropdownMenuSeparator.displayName = 'DropdownMenuSeparator';

// Shortcut component
const DropdownMenuShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn('ml-auto text-xs tracking-widest opacity-60', className)}
      {...props}
    />
  );
};
DropdownMenuShortcut.displayName = 'DropdownMenuShortcut';

// These components are kept for API compatibility but don't do anything
const DropdownMenuGroup: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className={cn('', className)} {...props}>
    {children}
  </div>
);
DropdownMenuGroup.displayName = 'DropdownMenuGroup';

const DropdownMenuPortal: React.FC<{children: React.ReactNode}> = ({children}) => <>{children}</>;
DropdownMenuPortal.displayName = 'DropdownMenuPortal';

// Sub-menu components
const DropdownMenuSub: React.FC<{children: React.ReactNode}> = ({children}) => <>{children}</>;
DropdownMenuSub.displayName = 'DropdownMenuSub';

// SubTrigger component
interface DropdownMenuSubTriggerProps extends React.HTMLAttributes<HTMLDivElement> {
  inset?: boolean;
  children?: React.ReactNode;
}

const DropdownMenuSubTrigger = React.forwardRef<HTMLDivElement, DropdownMenuSubTriggerProps>(
  ({className, inset, children, ...props}, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent',
        inset && 'pl-8',
        className
      )}
      {...props}
    >
      {children}
      <ChevronRight className="ml-auto h-4 w-4" />
    </div>
  )
);
DropdownMenuSubTrigger.displayName = 'DropdownMenuSubTrigger';

// SubContent component
interface DropdownMenuSubContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

const DropdownMenuSubContent = React.forwardRef<HTMLDivElement, DropdownMenuSubContentProps>(
  ({className, children, ...props}, ref) => (
    <div
      ref={ref}
      className={cn(
        'z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
DropdownMenuSubContent.displayName = 'DropdownMenuSubContent';

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
};
