'use client'

import * as React from 'react';

import {cn} from '@/lib/utils';

interface AspectRatioProps extends React.HTMLAttributes<HTMLDivElement> {
  ratio?: number;
}

const AspectRatio = React.forwardRef<HTMLDivElement, AspectRatioProps>(
  ({className, ratio = 1, style, ...props}, ref) => {
    return (
      <div
        ref={ref}
        style={{
          position: 'relative',
          width: '100%',
          paddingBottom: `${100 / ratio}%`,
          ...style,
        }}
        className={cn('overflow-hidden', className)}
        {...props}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
          }}
        >
          {props.children}
        </div>
      </div>
    );
  }
);

AspectRatio.displayName = 'AspectRatio';

export {AspectRatio};
