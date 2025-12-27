'use client'

import {Slider as AntSlider} from 'antd';
import type {SliderSingleProps} from 'antd/es/slider';
import * as React from 'react';

import {cn} from '@/lib/utils';

// Create a wrapper around Ant Design's Slider component
// that maintains the same API as the original shadcn/ui Slider component

export interface SliderProps extends Omit<SliderSingleProps, 'className'> {
    className?: string;
}

const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
    ({className, ...props}, ref) => {
        return (
            <div 
                ref={ref}
                className={cn(
                    'relative flex w-full touch-none select-none items-center',
                    className
                )}
            >
                <AntSlider
                    className="w-full"
                    trackStyle={{ backgroundColor: 'var(--primary)' }}
                    railStyle={{ backgroundColor: 'var(--secondary)' }}
                    handleStyle={{
                        borderColor: 'var(--primary)',
                        backgroundColor: 'var(--background)',
                        width: '20px',
                        height: '20px',
                        marginTop: '-8px'
                    }}
                    {...props}
                />
            </div>
        );
    }
);
Slider.displayName = 'Slider';

export {Slider};
