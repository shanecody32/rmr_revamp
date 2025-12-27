'use client'

import * as React from 'react';

import {cn} from '@/lib/utils';

// Create a custom ScrollArea component that provides similar functionality
// to the original Radix UI ScrollArea component using CSS

interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: 'auto' | 'always' | 'scroll' | 'hover';
  scrollHideDelay?: number;
}

const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({className, children, type = 'auto', ...props}, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'relative overflow-auto',
          type === 'auto' && 'scrollbar-auto',
          type === 'always' && 'scrollbar-thin',
          type === 'scroll' && 'scrollbar-thin hover:scrollbar-auto',
          type === 'hover' && 'scrollbar-none hover:scrollbar-thin',
          className
        )}
        style={{
          // Custom scrollbar styles
          scrollbarWidth: 'thin',
          scrollbarColor: 'var(--scrollbar-thumb) var(--scrollbar-track)',
          ...props.style,
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
);
ScrollArea.displayName = 'ScrollArea';

// ScrollBar component for API compatibility
interface ScrollBarProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'vertical' | 'horizontal';
}

const ScrollBar = React.forwardRef<HTMLDivElement, ScrollBarProps>(
  ({className, orientation = 'vertical', ...props}, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'pointer-events-none absolute',
          orientation === 'vertical' && 'right-0 top-0 h-full w-2',
          orientation === 'horizontal' && 'bottom-0 left-0 h-2 w-full',
          className
        )}
        {...props}
      />
    );
  }
);
ScrollBar.displayName = 'ScrollBar';

export {ScrollArea, ScrollBar};
