'use client'

import {Radio, Segmented} from 'antd';
import type {RadioChangeEvent, SegmentedProps} from 'antd';
import {VariantProps} from 'class-variance-authority'
import * as React from 'react';

import {toggleVariants} from '@/components/ui/inputs/toggle';
import {cn} from '@/lib/utils';

// Create a context to share variant and size props with child components
const ToggleGroupContext = React.createContext<
    VariantProps<typeof toggleVariants> & {
        type?: 'single' | 'multiple';
        value?: string | string[];
        onValueChange?: (value: string | string[]) => void;
    }
>({
    size: 'default',
    variant: 'default',
});

// Map shadcn/ui sizes to Ant Design sizes
const sizeMap = {
    default: 'middle',
    sm: 'small',
    lg: 'large',
};

export interface ToggleGroupProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'className' | 'value' | 'onChange'>, 
    VariantProps<typeof toggleVariants> {
    className?: string;
    type?: 'single' | 'multiple';
    value?: string | string[];
    defaultValue?: string | string[];
    onValueChange?: (value: string | string[]) => void;
}

const ToggleGroup = React.forwardRef<HTMLDivElement, ToggleGroupProps>(
    ({
        className, 
        variant = 'default', 
        size = 'default', 
        type = 'single',
        value,
        defaultValue,
        onValueChange,
        children,
        ...props
    }, ref) => {
        // Map shadcn/ui size to Ant Design size
        const sizeKey = size || 'default';
        const antSize = sizeMap[sizeKey as keyof typeof sizeMap] || 'middle';

        // If using Segmented component (for single selection)
        if (type === 'single') {
            // Convert children to options for Segmented
            const rawOptions = React.Children.map(children, (child) => {
                if (React.isValidElement(child) && child.type === ToggleGroupItem) {
                    const childProps = child.props as { value?: string; children?: React.ReactNode; disabled?: boolean };
                    const {value, children, disabled} = childProps;
                    if (value !== undefined) {
                        return {
                            value,
                            label: children,
                            disabled
                        };
                    }
                }
                return null;
            });
            
            const options: SegmentedProps['options'] = rawOptions ? rawOptions.filter((opt): opt is NonNullable<typeof opt> => opt !== null) : [];

            return (
                <div 
                    ref={ref}
                    className={cn('flex items-center justify-center gap-1', className)}
                    {...props}
                >
                    <Segmented
                        options={options}
                        value={value as string}
                        defaultValue={defaultValue as string}
                        onChange={(val) => onValueChange?.(val as string)}
                        size={antSize as any}
                        className={cn(
                            variant === 'outline' && 'border border-input rounded-md'
                        )}
                    />
                </div>
            );
        }

        // For multiple selection, use Radio.Group with Radio.Button
        return (
            <div 
                ref={ref}
                className={cn('flex items-center justify-center gap-1', className)}
                {...props}
            >
                <ToggleGroupContext.Provider value={{variant, size, type, value, onValueChange}}>
                    <Radio.Group
                        value={Array.isArray(value) ? value[0] : value}
                        defaultValue={Array.isArray(defaultValue) ? defaultValue[0] : defaultValue}
                        onChange={(e: RadioChangeEvent) => {
                            if (type === 'multiple') {
                                // For multiple selection, toggle the value in the array
                                const newValue = Array.isArray(value) ? [...value] : [];
                                const valueIndex = newValue.indexOf(e.target.value);

                                if (valueIndex === -1) {
                                    newValue.push(e.target.value);
                                } else {
                                    newValue.splice(valueIndex, 1);
                                }

                                onValueChange?.(newValue);
                            } else {
                                onValueChange?.(e.target.value);
                            }
                        }}
                        optionType="button"
                        buttonStyle={variant === 'outline' ? 'outline' : 'solid'}
                        size={antSize as any}
                    >
                        {children}
                    </Radio.Group>
                </ToggleGroupContext.Provider>
            </div>
        );
    }
);

ToggleGroup.displayName = 'ToggleGroup';

export interface ToggleGroupItemProps extends Omit<React.HTMLAttributes<HTMLButtonElement>, 'className' | 'value'>, 
    VariantProps<typeof toggleVariants> {
    className?: string;
    value: string;
    disabled?: boolean;
}

const ToggleGroupItem = React.forwardRef<HTMLButtonElement, ToggleGroupItemProps>(
    ({className, children, variant, size, value, disabled, ...props}, ref) => {
        const context = React.useContext(ToggleGroupContext);

        // Determine if this item is selected
        const isSelected = context.type === 'multiple' 
            ? Array.isArray(context.value) && context.value.includes(value)
            : context.value === value;

        // Filter out props that might cause type conflicts
        const { onChange, onClick, ...restProps } = props as any;

        return (
            <Radio.Button
                ref={ref as any}
                value={value}
                disabled={disabled}
                className={cn(
                    toggleVariants({
                        variant: context.variant || variant,
                        size: context.size || size,
                    }),
                    isSelected && 'bg-accent text-accent-foreground',
                    className
                )}
                onClick={onClick}
                {...restProps}
            >
                {children}
            </Radio.Button>
        );
    }
);

ToggleGroupItem.displayName = 'ToggleGroupItem';

export {ToggleGroup, ToggleGroupItem};
