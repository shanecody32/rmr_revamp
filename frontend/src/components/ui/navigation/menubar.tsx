'use client'

import {Menu, Dropdown, Divider} from 'antd';
import type {MenuProps, DropdownProps} from 'antd';
import {Check, ChevronRight, Circle} from 'lucide-react';
import * as React from 'react';

import {cn} from '@/lib/utils';

// Create wrapper components around Ant Design's Menu component
// that maintain a similar API to the original Radix UI Menubar components

// Main Menubar component
interface MenubarProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

const Menubar = React.forwardRef<HTMLDivElement, MenubarProps>(
  ({className, children, ...props}, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex h-10 items-center space-x-1 rounded-md border bg-background p-1',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
Menubar.displayName = 'Menubar';

// Menu component
interface MenubarMenuProps {
  children?: React.ReactNode;
  trigger?: ('click' | 'hover')[];
}

const MenubarMenu: React.FC<MenubarMenuProps> = ({
  children,
  trigger = ['click'],
}) => {
  return <>{children}</>;
};
MenubarMenu.displayName = 'MenubarMenu';

// Trigger component
interface MenubarTriggerProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

const MenubarTrigger = React.forwardRef<HTMLDivElement, MenubarTriggerProps>(
  ({className, children, ...props}, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex cursor-default select-none items-center rounded-sm px-3 py-1.5 text-sm font-medium outline-none focus:bg-accent focus:text-accent-foreground',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
MenubarTrigger.displayName = 'MenubarTrigger';

// Content component
interface MenubarContentProps extends Omit<MenuProps, 'ref'> {
  align?: 'start' | 'center' | 'end';
  alignOffset?: number;
  sideOffset?: number;
  children?: React.ReactNode;
}

const MenubarContent = React.forwardRef<HTMLDivElement, MenubarContentProps>(
  ({className, children, ...props}, ref) => (
    <Menu
      className={cn(
        'z-50 min-w-[12rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md',
        className
      )}
      {...props}
    >
      {children}
    </Menu>
  )
);
MenubarContent.displayName = 'MenubarContent';

// Item component
interface MenubarItemProps extends React.HTMLAttributes<HTMLDivElement> {
  inset?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
}

const MenubarItem = React.forwardRef<HTMLDivElement, MenubarItemProps>(
  ({className, inset, disabled, children, ...props}, ref) => {
    return (
      <div 
        ref={ref} 
        {...props}
        className={cn(
          'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground',
          disabled && 'pointer-events-none opacity-50',
          inset && 'pl-8',
          className
        )}
        aria-disabled={disabled}
      >
        {children}
      </div>
    );
  }
);
MenubarItem.displayName = 'MenubarItem';

// Checkbox item component
interface MenubarCheckboxItemProps extends React.HTMLAttributes<HTMLDivElement> {
  checked?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
}

const MenubarCheckboxItem = React.forwardRef<HTMLDivElement, MenubarCheckboxItemProps>(
  ({className, children, checked, disabled, ...props}, ref) => (
    <div
      ref={ref}
      className={cn(
        'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground',
        disabled && 'pointer-events-none opacity-50',
        className
      )}
      aria-disabled={disabled}
      role="menuitemcheckbox"
      aria-checked={checked}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        {checked && <Check className="h-4 w-4" />}
      </span>
      {children}
    </div>
  )
);
MenubarCheckboxItem.displayName = 'MenubarCheckboxItem';

// Radio group component
const MenubarRadioGroup: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className={cn('', className)} {...props}>
    {children}
  </div>
);
MenubarRadioGroup.displayName = 'MenubarRadioGroup';

// Radio item component
interface MenubarRadioItemProps extends React.HTMLAttributes<HTMLDivElement> {
  checked?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
}

const MenubarRadioItem = React.forwardRef<HTMLDivElement, MenubarRadioItemProps>(
  ({className, children, checked, disabled, ...props}, ref) => (
    <div
      ref={ref}
      className={cn(
        'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground',
        disabled && 'pointer-events-none opacity-50',
        className
      )}
      aria-disabled={disabled}
      role="menuitemradio"
      aria-checked={checked}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        {checked && <Circle className="h-2 w-2 fill-current" />}
      </span>
      {children}
    </div>
  )
);
MenubarRadioItem.displayName = 'MenubarRadioItem';

// Label component
interface MenubarLabelProps extends React.HTMLAttributes<HTMLDivElement> {
  inset?: boolean;
  children?: React.ReactNode;
}

const MenubarLabel = React.forwardRef<HTMLDivElement, MenubarLabelProps>(
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
MenubarLabel.displayName = 'MenubarLabel';

// Separator component
const MenubarSeparator = React.forwardRef<
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
MenubarSeparator.displayName = 'MenubarSeparator';

// Shortcut component
const MenubarShortcut = ({
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
MenubarShortcut.displayName = 'MenubarShortcut';

// These components are kept for API compatibility but don't do anything
const MenubarPortal: React.FC<{children: React.ReactNode}> = ({children}) => <>{children}</>;
MenubarPortal.displayName = 'MenubarPortal';

const MenubarSub: React.FC<{children: React.ReactNode}> = ({children}) => <>{children}</>;
MenubarSub.displayName = 'MenubarSub';

const MenubarGroup: React.FC<{children: React.ReactNode}> = ({children}) => <>{children}</>;
MenubarGroup.displayName = 'MenubarGroup';

// SubTrigger component
interface MenubarSubTriggerProps extends React.HTMLAttributes<HTMLDivElement> {
  inset?: boolean;
  children?: React.ReactNode;
}

const MenubarSubTrigger = React.forwardRef<HTMLDivElement, MenubarSubTriggerProps>(
  ({className, inset, children, ...props}, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground',
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
MenubarSubTrigger.displayName = 'MenubarSubTrigger';

// SubContent component
interface MenubarSubContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

const MenubarSubContent = React.forwardRef<HTMLDivElement, MenubarSubContentProps>(
  ({className, children, ...props}, ref) => (
    <div
      ref={ref}
      className={cn(
        'z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
MenubarSubContent.displayName = 'MenubarSubContent';

export {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
  MenubarSeparator,
  MenubarLabel,
  MenubarCheckboxItem,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarPortal,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarGroup,
  MenubarSub,
  MenubarShortcut,
};
