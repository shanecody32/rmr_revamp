'use client'

import {Collapse} from 'antd';
import type {CollapseProps} from 'antd';
import * as React from 'react';

import {cn} from '@/lib/utils';

// Create wrapper components around Ant Design's Collapse component
// that maintain a similar API to the original Radix UI Collapsible components

interface CollapsibleProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  children?: React.ReactNode;
  className?: string;
}

const Collapsible = React.forwardRef<HTMLDivElement, CollapsibleProps>(
  ({open, defaultOpen, onOpenChange, disabled, children, className, ...props}, ref) => {
    // Convert props to Ant Design Collapse props
    const activeKey = open ? ['1'] : [];
    const defaultActiveKey = defaultOpen ? ['1'] : [];

    const handleChange = (keys: string | string[]) => {
      const isOpen = Array.isArray(keys) ? keys.includes('1') : keys === '1';
      onOpenChange?.(isOpen);
    };

    return (
      <Collapse
        ref={ref}
        activeKey={open !== undefined ? activeKey : undefined}
        defaultActiveKey={defaultOpen !== undefined ? defaultActiveKey : undefined}
        onChange={handleChange}
        className={className}
        ghost
        {...props}
      >
        {children}
      </Collapse>
    );
  }
);
Collapsible.displayName = 'Collapsible';

// Trigger component that toggles the collapsible
interface CollapsibleTriggerProps {
  children?: React.ReactNode;
  className?: string;
  asChild?: boolean;
}

const CollapsibleTrigger = React.forwardRef<HTMLDivElement, CollapsibleTriggerProps>(
  ({children, className, ...props}, ref) => {
    return (
      <div ref={ref} className={cn('cursor-pointer', className)} {...props}>
        {children}
      </div>
    );
  }
);
CollapsibleTrigger.displayName = 'CollapsibleTrigger';

// Content component that is shown/hidden
interface CollapsibleContentProps {
  children?: React.ReactNode;
  className?: string;
  forceMount?: boolean;
}

const CollapsibleContent = React.forwardRef<HTMLDivElement, CollapsibleContentProps>(
  ({children, className, ...props}, ref) => {
    return (
      <Collapse.Panel 
        ref={ref} 
        key="1" 
        header={null} 
        showArrow={false}
        className={className}
        {...props}
      >
        {children}
      </Collapse.Panel>
    );
  }
);
CollapsibleContent.displayName = 'CollapsibleContent';

export {Collapsible, CollapsibleTrigger, CollapsibleContent};
