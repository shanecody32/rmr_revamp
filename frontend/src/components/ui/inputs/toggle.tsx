'use client'

import {Button} from 'antd';
import {cva, type VariantProps} from 'class-variance-authority';
import * as React from 'react';

import {cn} from '@/lib/utils';

// Maintain the toggleVariants function for compatibility with existing code
const toggleVariants = cva(
    'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground',
    {
        variants: {
            variant: {
                default: 'bg-transparent',
                outline:
                    'border border-input bg-transparent hover:bg-accent hover:text-accent-foreground',
            },
            size: {
                default: 'h-10 px-3',
                sm: 'h-9 px-2.5',
                lg: 'h-11 px-5',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    }
);

// Map shadcn/ui sizes to Ant Design sizes
const sizeMap = {
    default: 'middle',
    sm: 'small',
    lg: 'large',
};

export interface ToggleProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className'>, 
    VariantProps<typeof toggleVariants> {
    className?: string;
    pressed?: boolean;
    defaultPressed?: boolean;
    onPressedChange?: (pressed: boolean) => void;
}

const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
    ({
        className, 
        variant = 'default', 
        size = 'default', 
        pressed, 
        defaultPressed, 
        onPressedChange,
        onClick,
        children,
        ...props
    }, ref) => {
        // Use internal state if it's an uncontrolled component
        const [internalPressed, setInternalPressed] = React.useState(defaultPressed || false);

        // Determine if the component is controlled or uncontrolled
        const isControlled = pressed !== undefined;
        const isActive = isControlled ? pressed : internalPressed;

        // Map shadcn/ui size to Ant Design size
        const sizeKey = size || 'default';
        const antSize = sizeMap[sizeKey as keyof typeof sizeMap] || 'middle';

        const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
            // Call the original onClick handler if provided
            onClick?.(e);

            // Toggle the pressed state
            const newPressed = !isActive;

            // Update internal state if uncontrolled
            if (!isControlled) {
                setInternalPressed(newPressed);
            }

            // Call the onPressedChange handler if provided
            onPressedChange?.(newPressed);
        };

        // Filter out props that might cause type conflicts
        const { type, ...restProps } = props as any;

        return (
            <Button
                ref={ref}
                type={isActive ? 'primary' : 'default'}
                ghost={variant === 'outline'}
                size={antSize as any}
                className={cn(
                    toggleVariants({ variant, size, className }),
                    isActive && 'bg-accent text-accent-foreground'
                )}
                onClick={handleClick}
                {...restProps}
            >
                {children}
            </Button>
        );
    }
);

Toggle.displayName = 'Toggle';

export {Toggle, toggleVariants};
