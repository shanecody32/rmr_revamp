'use client'

import {Tabs as AntTabs} from 'antd';
import type {TabsProps} from 'antd';
import * as React from 'react';

import {cn} from '@/lib/utils';

// Create wrapper components around Ant Design's Tabs component
// that maintain a similar API to the original Radix UI Tabs components

interface TabsRootProps extends Omit<TabsProps, 'items'> {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children?: React.ReactNode;
}

const Tabs = React.forwardRef<HTMLDivElement, TabsRootProps>(
  ({defaultValue, value, onValueChange, children, className, ...props}, ref) => {
    // Convert between Radix UI and Ant Design props
    const activeKey = value;
    const defaultActiveKey = defaultValue;

    const handleChange = (key: string) => {
      onValueChange?.(key);
    };

    return (
      <AntTabs
        activeKey={activeKey}
        defaultActiveKey={defaultActiveKey}
        onChange={handleChange}
        className={className}
        {...props}
      >
        {children}
      </AntTabs>
    );
  }
);
Tabs.displayName = 'Tabs';

// TabsList component for grouping tab triggers
interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({className, children, ...props}, ref) => (
    <div
      ref={ref}
      className={cn(
        'inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
TabsList.displayName = 'TabsList';

// TabsTrigger component for individual tabs
interface TabsTriggerProps extends Omit<React.ComponentProps<typeof AntTabs.TabPane>, 'tab'> {
  value: string;
  disabled?: boolean;
  children?: React.ReactNode;
  className?: string;
}

const TabsTrigger = React.forwardRef<HTMLDivElement, TabsTriggerProps>(
  ({className, value, disabled, children, ...props}, ref) => (
    <AntTabs.TabPane
      tab={
        <div
          ref={ref}
          className={cn(
            'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
            className
          )}
        >
          {children}
        </div>
      }
      key={value}
      disabled={disabled}
      {...props}
    />
  )
);
TabsTrigger.displayName = 'TabsTrigger';

// TabsContent component for tab content
interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  forceMount?: boolean;
  children?: React.ReactNode;
}

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({className, value, children, ...props}, ref) => (
    <div
      ref={ref}
      role="tabpanel"
      data-value={value}
      className={cn(
        'mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
TabsContent.displayName = 'TabsContent';

export {Tabs, TabsList, TabsTrigger, TabsContent};
