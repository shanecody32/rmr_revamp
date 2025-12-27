'use client'

import {Alert as AntAlert} from 'antd';
import type {AlertProps as AntAlertProps} from 'antd';
import * as React from 'react';

import {cn} from '@/lib/utils';

// Create wrapper components around Ant Design's Alert component
// that maintain the same API as the original shadcn/ui Alert components

interface AlertProps extends Omit<AntAlertProps, 'type'> {
    variant?: 'default' | 'destructive';
    className?: string;
    children?: React.ReactNode;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
    ({className, variant = 'default', children, ...props}, ref) => {
        // Map shadcn/ui variants to Ant Design types
        const type = variant === 'destructive' ? 'error' : 'info';

        // Extract title and description from children if they exist
        let title: React.ReactNode = null;
        let description: React.ReactNode = null;

        React.Children.forEach(children, (child) => {
            if (React.isValidElement(child)) {
                const childProps = child.props as { children?: React.ReactNode };
                if (child.type === AlertTitle) {
                    title = childProps.children;
                } else if (child.type === AlertDescription) {
                    description = childProps.children;
                }
            }
        });

        return (
            <AntAlert
                className={cn('w-full', className)}
                type={type}
                title={title}
                description={description}
                {...props}
            />
        );
    }
);
Alert.displayName = 'Alert';

interface AlertTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

const AlertTitle = React.forwardRef<HTMLHeadingElement, AlertTitleProps>(
    ({className, ...props}, ref) => (
        <span
            ref={ref as any}
            className={cn('font-medium', className)}
            {...props}
        />
    )
);
AlertTitle.displayName = 'AlertTitle';

interface AlertDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

const AlertDescription = React.forwardRef<HTMLParagraphElement, AlertDescriptionProps>(
    ({className, ...props}, ref) => (
        <span
            ref={ref as any}
            className={cn('text-sm', className)}
            {...props}
        />
    )
);
AlertDescription.displayName = 'AlertDescription';

export {Alert, AlertTitle, AlertDescription};
