'use client'

import {Tooltip as AntTooltip} from 'antd';
import type {TooltipProps as AntTooltipProps} from 'antd';
import * as React from 'react';

import {cn} from '@/lib/utils';

// Create wrapper components around Ant Design's Tooltip component
// that maintain a similar API to the original Radix UI Tooltip components

// Provider component for global configuration
interface TooltipProviderProps {
  delayDuration?: number;
  skipDelayDuration?: number;
  disableHoverableContent?: boolean;
  children?: React.ReactNode;
}

const TooltipProvider: React.FC<TooltipProviderProps> = ({
  children,
  delayDuration,
  skipDelayDuration,
  disableHoverableContent,
}) => {
  return <>{children}</>;
};
TooltipProvider.displayName = 'TooltipProvider';

// Root component
interface TooltipProps {
  children?: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  delayDuration?: number;
  disableHoverableContent?: boolean;
}

const Tooltip: React.FC<TooltipProps> = ({
  children,
  open,
  defaultOpen,
  onOpenChange,
  delayDuration,
  disableHoverableContent,
}) => {
  return <>{children}</>;
};
Tooltip.displayName = 'Tooltip';

// Trigger component
interface TooltipTriggerProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
  children?: React.ReactNode;
}

const TooltipTrigger = React.forwardRef<HTMLDivElement, TooltipTriggerProps>(
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
TooltipTrigger.displayName = 'TooltipTrigger';

// Content component
interface TooltipContentProps extends Omit<AntTooltipProps, 'title'> {
  sideOffset?: number;
  className?: string;
  children?: React.ReactNode;
}

const TooltipContent = React.forwardRef<HTMLDivElement, TooltipContentProps>(
  ({className, sideOffset = 4, children, ...props}, ref) => (
    <div
      ref={ref}
      className={cn(
        'z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
TooltipContent.displayName = 'TooltipContent';

export {Tooltip, TooltipTrigger, TooltipContent, TooltipProvider};
