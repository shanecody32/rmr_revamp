import {Button as AntButton} from 'antd';
import {cva, type VariantProps} from 'class-variance-authority';
import * as React from 'react';

import {cn} from '@/lib/utils';

// Maintain the buttonVariants function for compatibility with existing code
const buttonVariants = cva(
    'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
    {
        variants: {
            variant: {
                default: 'bg-primary text-primary-foreground hover:bg-primary/90',
                destructive:
                    'bg-destructive text-destructive-foreground hover:bg-destructive/90',
                outline:
                    'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
                secondary:
                    'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                ghost: 'hover:bg-accent hover:text-accent-foreground',
                link: 'text-primary underline-offset-4 hover:underline',
            },
            size: {
                default: 'h-10 px-4 py-2',
                sm: 'h-9 rounded-md px-3',
                lg: 'h-11 rounded-md px-8',
                icon: 'h-10 w-10',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    }
);

// Map shadcn/ui variants to Ant Design variants
const variantMap = {
    default: 'primary',
    destructive: 'primary danger',
    outline: 'default',
    secondary: 'default',
    ghost: 'text',
    link: 'link',
};

// Map shadcn/ui sizes to Ant Design sizes
const sizeMap = {
    default: 'middle',
    sm: 'small',
    lg: 'large',
    icon: 'middle',
};

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof buttonVariants> {
    asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({className, variant = 'default', size = 'default', asChild = false, children, ...props}, ref) => {
        // Map shadcn/ui variant to Ant Design type and danger props
        const variantKey = variant || 'default';
        const antType = variantKey === 'destructive' ? 'primary' : variantMap[variantKey as keyof typeof variantMap] || 'default';
        const isDanger = variantKey === 'destructive';

        // Map shadcn/ui size to Ant Design size
        const sizeKey = size || 'default';
        const antSize = sizeMap[sizeKey as keyof typeof sizeMap] || 'middle';

        // For icon buttons, we need to adjust the style
        const isIconButton = size === 'icon';

        // Filter out props that might cause type conflicts
        const { color, ...restProps } = props as any;

        return (
            <AntButton
                type={antType as any}
                danger={isDanger}
                size={antSize as any}
                className={cn(
                    // Apply Tailwind classes for compatibility
                    isIconButton && 'w-10 h-10 p-0 flex items-center justify-center',
                    className
                )}
                ref={ref as any}
                {...restProps}
            >
                {children}
            </AntButton>
        );
    }
);
Button.displayName = 'Button';

export {Button, buttonVariants};
