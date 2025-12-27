'use client'

import {Dropdown, Menu, Divider, Space, Typography} from 'antd';
import type {DropdownProps, MenuProps} from 'antd';
import {Check, ChevronRight, Circle} from 'lucide-react';
import * as React from 'react';

import {cn} from '@/lib/utils';

// Create wrapper components around Ant Design's Dropdown and Menu components
// that maintain a similar API to the original Radix UI ContextMenu components

interface ContextMenuProps {
  children: React.ReactNode;
  trigger?: ('click' | 'hover' | 'contextMenu')[];
  menu?: React.ReactElement;
}

const ContextMenu: React.FC<ContextMenuProps> = ({
  children,
  trigger = ['contextMenu'],
  menu,
}) => {
  return (
    <Dropdown overlay={menu} trigger={trigger}>
      {children}
    </Dropdown>
  );
};

const ContextMenuTrigger: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  ...props
}) => {
  return <div {...props}>{children}</div>;
};

const ContextMenuGroup: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  ...props
}) => {
  return <div {...props}>{children}</div>;
};

// This is a no-op component for API compatibility
const ContextMenuPortal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

// Sub-menu functionality using Ant Design's Menu.SubMenu
const ContextMenuSub = Menu.SubMenu;

// Radio group functionality using Ant Design's Menu
const ContextMenuRadioGroup: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  ...props
}) => {
  return <div {...props}>{children}</div>;
};

// SubTrigger component using Ant Design's Menu.Item
interface ContextMenuSubTriggerProps extends React.HTMLAttributes<HTMLDivElement> {
  inset?: boolean;
  icon?: React.ReactNode;
}

const ContextMenuSubTrigger = React.forwardRef<
  HTMLDivElement,
  ContextMenuSubTriggerProps
>(({className, inset, children, ...props}, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none',
      inset && 'pl-8',
      className
    )}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto h-4 w-4"/>
  </div>
));
ContextMenuSubTrigger.displayName = 'ContextMenuSubTrigger';

// SubContent component using Ant Design's Menu
const ContextMenuSubContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({className, ...props}, ref) => (
  <div
    ref={ref}
    className={cn(
      'z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md',
      className
    )}
    {...props}
  />
));
ContextMenuSubContent.displayName = 'ContextMenuSubContent';

// Content component using Ant Design's Menu
interface ContextMenuContentProps extends React.HTMLAttributes<HTMLDivElement> {
  items?: MenuProps['items'];
}

const ContextMenuContent = React.forwardRef<
  HTMLDivElement,
  ContextMenuContentProps
>(({className, items, children, ...props}, ref) => (
  <div
    ref={ref}
    className={cn(
      'z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md',
      className
    )}
    {...props}
  >
    {items ? <Menu items={items} /> : children}
  </div>
));
ContextMenuContent.displayName = 'ContextMenuContent';

// Menu Item component using Ant Design's Menu.Item
interface ContextMenuItemProps extends React.HTMLAttributes<HTMLDivElement> {
  inset?: boolean;
  disabled?: boolean;
}

const ContextMenuItem = React.forwardRef<
  HTMLDivElement,
  ContextMenuItemProps
>(({className, inset, disabled, ...props}, ref) => (
  <div
    ref={ref}
    className={cn(
      'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none',
      inset && 'pl-8',
      disabled && 'pointer-events-none opacity-50',
      className
    )}
    {...props}
  />
));
ContextMenuItem.displayName = 'ContextMenuItem';

// Checkbox Item component using Ant Design's Menu.Item with checkbox
interface ContextMenuCheckboxItemProps extends React.HTMLAttributes<HTMLDivElement> {
  checked?: boolean;
  disabled?: boolean;
}

const ContextMenuCheckboxItem = React.forwardRef<
  HTMLDivElement,
  ContextMenuCheckboxItemProps
>(({className, children, checked, disabled, ...props}, ref) => (
  <div
    ref={ref}
    className={cn(
      'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none',
      disabled && 'pointer-events-none opacity-50',
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      {checked && <Check className="h-4 w-4"/>}
    </span>
    {children}
  </div>
));
ContextMenuCheckboxItem.displayName = 'ContextMenuCheckboxItem';

// Radio Item component using Ant Design's Menu.Item with radio
interface ContextMenuRadioItemProps extends React.HTMLAttributes<HTMLDivElement> {
  checked?: boolean;
  disabled?: boolean;
}

const ContextMenuRadioItem = React.forwardRef<
  HTMLDivElement,
  ContextMenuRadioItemProps
>(({className, children, checked, disabled, ...props}, ref) => (
  <div
    ref={ref}
    className={cn(
      'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none',
      disabled && 'pointer-events-none opacity-50',
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      {checked && <Circle className="h-2 w-2 fill-current"/>}
    </span>
    {children}
  </div>
));
ContextMenuRadioItem.displayName = 'ContextMenuRadioItem';

// Label component using Ant Design's Typography
interface ContextMenuLabelProps extends React.HTMLAttributes<HTMLDivElement> {
  inset?: boolean;
}

const ContextMenuLabel = React.forwardRef<
  HTMLDivElement,
  ContextMenuLabelProps
>(({className, inset, ...props}, ref) => (
  <div
    ref={ref}
    className={cn(
      'px-2 py-1.5 text-sm font-semibold text-foreground',
      inset && 'pl-8',
      className
    )}
    {...props}
  />
));
ContextMenuLabel.displayName = 'ContextMenuLabel';

// Separator component using Ant Design's Divider
const ContextMenuSeparator = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof Divider>
>(({className, ...props}, ref) => (
  <div ref={ref}>
    <Divider
      className={cn('-mx-1 my-1 h-px bg-border', className)}
      {...props}
    />
  </div>
));
ContextMenuSeparator.displayName = 'ContextMenuSeparator';

const ContextMenuShortcut = ({
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
ContextMenuShortcut.displayName = 'ContextMenuShortcut';

export {
    ContextMenu,
    ContextMenuTrigger,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuCheckboxItem,
    ContextMenuRadioItem,
    ContextMenuLabel,
    ContextMenuSeparator,
    ContextMenuShortcut,
    ContextMenuGroup,
    ContextMenuPortal,
    ContextMenuSub,
    ContextMenuSubContent,
    ContextMenuSubTrigger,
    ContextMenuRadioGroup,
};
