'use client'

import * as React from 'react';

import {OtpInput} from '@/components/common/forms/fields/OtpInput';
import {cn} from '@/lib/utils';

// Create wrapper components around Ant Design-based OtpInput component
// that maintain the same API as the original shadcn/ui InputOTP components

export interface InputOTPProps {
    value?: string;
    onChange?: (value: string) => void;
    maxLength?: number;
    disabled?: boolean;
    autoFocus?: boolean;
    className?: string;
    containerClassName?: string;
}

const InputOTP = React.forwardRef<HTMLDivElement, InputOTPProps>(
    ({className, containerClassName, maxLength = 6, value = '', onChange, disabled, autoFocus, ...props}, ref) => {
        const handleChange = (newValue: string) => {
            onChange?.(newValue);
        };

        return (
            <div 
                ref={ref} 
                className={cn('flex items-center gap-2 has-[:disabled]:opacity-50', containerClassName)}
            >
                <OtpInput
                    value={value}
                    onChange={handleChange}
                    length={maxLength}
                    disabled={disabled}
                    autoFocus={autoFocus}
                    className={cn('disabled:cursor-not-allowed', className)}
                    {...props}
                />
            </div>
        );
    }
);
InputOTP.displayName = 'InputOTP';

// These components are kept for API compatibility but their functionality
// is now handled by the OtpInput component
const InputOTPGroup = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({className, ...props}, ref) => (
    <div ref={ref} className={cn('flex items-center', className)} {...props} />
));
InputOTPGroup.displayName = 'InputOTPGroup';

const InputOTPSlot = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { index: number }
>(({index, className, ...props}, ref) => (
    <div
        ref={ref}
        className={cn(
            'relative flex h-10 w-10 items-center justify-center border-y border-r border-input text-sm transition-all first:rounded-l-md first:border-l last:rounded-r-md',
            className
        )}
        {...props}
    />
));
InputOTPSlot.displayName = 'InputOTPSlot';

const InputOTPSeparator = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({...props}, ref) => (
    <div ref={ref} role="separator" {...props} />
));
InputOTPSeparator.displayName = 'InputOTPSeparator';

export {InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator};
