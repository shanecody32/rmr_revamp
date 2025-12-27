import {Input as AntInput} from 'antd';
import * as React from 'react';

import {cn} from '@/lib/utils';

export interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({className, type, ...props}, ref) => {
        // Filter out props that might cause type conflicts
        const { size, color, ...restProps } = props as any;
        
        return (
            <AntInput
                type={type}
                className={cn(
                    // Apply Tailwind classes for compatibility
                    'flex h-10 w-full rounded-md',
                    className
                )}
                ref={ref as any}
                {...restProps}
            />
        );
    }
);
Input.displayName = 'Input';

export {Input};
