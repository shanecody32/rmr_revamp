'use client'

import {Divider} from 'antd';
import * as React from 'react';

import {cn} from '@/lib/utils';

interface SeparatorProps extends Omit<React.ComponentPropsWithoutRef<typeof Divider>, 'type' | 'orientation'> {
  direction?: 'horizontal' | 'vertical';
  decorative?: boolean;
}

const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  (
    {className, direction = 'horizontal', decorative = true, ...props},
    ref
  ) => (
    <div ref={ref}>
      <Divider
        className={cn(
          'shrink-0 bg-border',
          direction === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px] min-h-[20px]',
          className
        )}
        {...props}
        // Convert direction to Ant Design's type
        type={direction === 'vertical' ? 'vertical' : 'horizontal'}
        // Use aria-hidden for decorative separators
        aria-hidden={decorative}
      />
    </div>
  )
);
Separator.displayName = 'Separator';

export {Separator};
