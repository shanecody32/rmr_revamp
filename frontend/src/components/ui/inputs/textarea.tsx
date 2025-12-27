import {Input} from 'antd';
import type {TextAreaProps as AntTextAreaProps} from 'antd/es/input';
import * as React from 'react';

import {cn} from '@/lib/utils';

export interface TextareaProps
    extends Omit<AntTextAreaProps, 'className'> {
    className?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({className, ...props}, ref) => {
        return (
            <Input.TextArea
                className={cn(
                    // Apply Tailwind classes for compatibility
                    'flex min-h-[80px] w-full rounded-md',
                    className
                )}
                autoSize={{minRows: 3}}
                ref={ref as any}
                {...props}
            />
        );
    }
);
Textarea.displayName = 'Textarea';

export {Textarea};
