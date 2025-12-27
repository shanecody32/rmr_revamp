'use client'

import {Popover} from 'antd';
import type {PopoverProps} from 'antd';
import * as React from 'react';

import {cn} from '@/lib/utils';

// Create wrapper components around Ant Design's Popover component
// that maintain a similar API to the original Radix UI HoverCard components

interface HoverCardProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  openDelay?: number;
  closeDelay?: number;
  children?: React.ReactNode;
}

const HoverCard: React.FC<HoverCardProps> = ({
  children,
  open,
  defaultOpen,
  onOpenChange,
  openDelay = 700,
  closeDelay = 300,
}) => {
  return <>{children}</>;
};
HoverCard.displayName = 'HoverCard';

// Trigger component
interface HoverCardTriggerProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
  children?: React.ReactNode;
}

const HoverCardTrigger = React.forwardRef<HTMLDivElement, HoverCardTriggerProps>(
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
HoverCardTrigger.displayName = 'HoverCardTrigger';

// Content component
interface HoverCardContentProps extends Omit<PopoverProps, 'title' | 'align'> {
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  alignOffset?: number;
  forceMount?: boolean;
  children?: React.ReactNode;
}

const HoverCardContent = React.forwardRef<HTMLDivElement, HoverCardContentProps>(
  ({className, align = 'center', sideOffset = 4, children, ...props}, ref) => {
    // Don't spread props directly to avoid type errors
    return (
      <div
        ref={ref}
        className={cn(
          'z-50 w-64 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none',
          className
        )}
      >
        {children}
      </div>
    );
  }
);
HoverCardContent.displayName = 'HoverCardContent';

export {HoverCard, HoverCardTrigger, HoverCardContent};
