'use client'

import {Form as AntForm} from 'antd';
import type {FormInstance, FormItemProps as AntFormItemProps, Rule} from 'antd/es/form';
import * as React from 'react';
import {Controller, ControllerProps, FieldPath, FieldValues, FormProvider, useFormContext as useReactHookFormContext} from 'react-hook-form';

import {cn} from '@/lib/utils';

// Re-export FormProvider from react-hook-form for backward compatibility
const Form = FormProvider;

// Context to store the form field name
type FormFieldContextValue<
    TFieldValues extends FieldValues = FieldValues,
    TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = {
    name: TName;
};

const FormFieldContext = React.createContext<FormFieldContextValue>(
    {} as FormFieldContextValue
);

// FormField component that wraps react-hook-form's Controller
const FormField = <
    TFieldValues extends FieldValues = FieldValues,
    TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
      ...props
  }: ControllerProps<TFieldValues, TName>) => {
    return (
        <FormFieldContext.Provider value={{name: props.name}}>
            <Controller {...props} />
        </FormFieldContext.Provider>
    );
};

// Hook to access form field context
const useFormField = () => {
    const fieldContext = React.useContext(FormFieldContext);
    const itemContext = React.useContext(FormItemContext);
    const {getFieldState, formState} = useReactHookFormContext();

    const fieldState = getFieldState(fieldContext.name, formState);

    if (!fieldContext) {
        throw new Error('useFormField should be used within <FormField>');
    }

    const {id} = itemContext;

    return {
        id,
        name: fieldContext.name,
        formItemId: `${id}-form-item`,
        formDescriptionId: `${id}-form-item-description`,
        formMessageId: `${id}-form-item-message`,
        ...fieldState,
    };
};

// Context to store the form item ID
type FormItemContextValue = {
    id: string;
};

const FormItemContext = React.createContext<FormItemContextValue>(
    {} as FormItemContextValue
);

// FormItem component that wraps Ant Design's Form.Item
interface FormItemProps extends Omit<AntFormItemProps, 'children'> {
    className?: string;
    children?: React.ReactNode;
}

const FormItem = React.forwardRef<HTMLDivElement, FormItemProps>(
    ({className, children, ...props}, ref) => {
        const id = React.useId();

        return (
            <FormItemContext.Provider value={{id}}>
                <div ref={ref} className={cn('space-y-2', className)}>
                    <AntForm.Item {...props}>
                        {children}
                    </AntForm.Item>
                </div>
            </FormItemContext.Provider>
        );
    }
);
FormItem.displayName = 'FormItem';

// FormLabel component that renders a label
const FormLabel = React.forwardRef<
    HTMLLabelElement,
    React.LabelHTMLAttributes<HTMLLabelElement>
>(({className, ...props}, ref) => {
    const {error, formItemId} = useFormField();

    return (
        <label
            ref={ref}
            className={cn(
                'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
                error && 'text-destructive',
                className
            )}
            htmlFor={formItemId}
            {...props}
        />
    );
});
FormLabel.displayName = 'FormLabel';

// FormControl component that wraps form controls
const FormControl = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({...props}, ref) => {
    const {error, formItemId, formDescriptionId, formMessageId} =
        useFormField();

    return (
        <div
            ref={ref}
            id={formItemId}
            aria-describedby={
                !error
                    ? `${formDescriptionId}`
                    : `${formDescriptionId} ${formMessageId}`
            }
            aria-invalid={!!error}
            {...props}
        />
    );
});
FormControl.displayName = 'FormControl';

// FormDescription component that renders a description
const FormDescription = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLParagraphElement>
>(({className, ...props}, ref) => {
    const {formDescriptionId} = useFormField();

    return (
        <p
            ref={ref}
            id={formDescriptionId}
            className={cn('text-sm text-muted-foreground', className)}
            {...props}
        />
    );
});
FormDescription.displayName = 'FormDescription';

// FormMessage component that renders an error message
const FormMessage = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLParagraphElement>
>(({className, children, ...props}, ref) => {
    const {error, formMessageId} = useFormField();
    const body = error ? String(error?.message) : children;

    if (!body) {
        return null;
    }

    return (
        <p
            ref={ref}
            id={formMessageId}
            className={cn('text-sm font-medium text-destructive', className)}
            {...props}
        >
            {body}
        </p>
    );
});
FormMessage.displayName = 'FormMessage';

export {
    useFormField,
    Form,
    FormItem,
    FormLabel,
    FormControl,
    FormDescription,
    FormMessage,
    FormField,
};
