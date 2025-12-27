'use client'

import {Modal} from 'antd';
import type {ModalProps as AntModalProps} from 'antd';
import {X} from 'lucide-react';
import * as React from 'react';

import {cn} from '@/lib/utils';

// Create wrapper components around Ant Design's Modal component
// that maintain the same API as the original shadcn/ui Dialog components

// Context to manage the dialog state
const DialogContext = React.createContext<{
    open: boolean;
    setOpen: (open: boolean) => void;
    onOpenChange?: (open: boolean) => void;
}>({
    open: false,
    setOpen: () => {},
});

// Main Dialog component
interface DialogProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    children?: React.ReactNode;
}

const Dialog = ({open = false, onOpenChange, children}: DialogProps) => {
    const [isOpen, setIsOpen] = React.useState(open);

    React.useEffect(() => {
        setIsOpen(open);
    }, [open]);

    const handleOpenChange = (newOpen: boolean) => {
        setIsOpen(newOpen);
        onOpenChange?.(newOpen);
    };

    return (
        <DialogContext.Provider value={{open: isOpen, setOpen: handleOpenChange, onOpenChange}}>
            {children}
        </DialogContext.Provider>
    );
};

// Dialog trigger component
interface DialogTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    asChild?: boolean;
    children?: React.ReactNode;
}

const DialogTrigger = React.forwardRef<HTMLButtonElement, DialogTriggerProps>(
    ({asChild = false, children, ...props}, ref) => {
        const {setOpen} = React.useContext(DialogContext);

        return (
            <button
                ref={ref}
                type="button"
                onClick={() => setOpen(true)}
                {...props}
            >
                {children}
            </button>
        );
    }
);
DialogTrigger.displayName = 'DialogTrigger';

// These components are kept for API compatibility but don't do anything
const DialogPortal = ({children}: {children: React.ReactNode}) => <>{children}</>;
const DialogOverlay = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({className, ...props}, ref) => <div ref={ref} className={className} {...props} />
);
DialogOverlay.displayName = 'DialogOverlay';

// Dialog close button
interface DialogCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    asChild?: boolean;
    children?: React.ReactNode;
}

const DialogClose = React.forwardRef<HTMLButtonElement, DialogCloseProps>(
    ({asChild = false, children, ...props}, ref) => {
        const {setOpen} = React.useContext(DialogContext);

        return (
            <button
                ref={ref}
                type="button"
                onClick={() => setOpen(false)}
                {...props}
            >
                {children}
            </button>
        );
    }
);
DialogClose.displayName = 'DialogClose';

// Dialog content component
interface DialogContentProps extends Omit<AntModalProps, 'open' | 'onCancel'> {
    children?: React.ReactNode;
    className?: string;
}

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
    ({className, children, ...props}, ref) => {
        const {open, setOpen} = React.useContext(DialogContext);

        return (
            <Modal
                open={open}
                onCancel={() => setOpen(false)}
                footer={null}
                closeIcon={null}
                centered
                className={cn('p-0', className)}
                {...props}
            >
                <div ref={ref} className="relative">
                    {children}
                    <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
                        <X className="h-4 w-4" />
                        <span className="sr-only">Close</span>
                    </DialogClose>
                </div>
            </Modal>
        );
    }
);
DialogContent.displayName = 'DialogContent';

// Dialog header component
const DialogHeader = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            'flex flex-col space-y-1.5 text-center sm:text-left',
            className
        )}
        {...props}
    />
);
DialogHeader.displayName = 'DialogHeader';

// Dialog footer component
const DialogFooter = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2',
            className
        )}
        {...props}
    />
);
DialogFooter.displayName = 'DialogFooter';

// Dialog title component
const DialogTitle = React.forwardRef<
    HTMLHeadingElement,
    React.HTMLAttributes<HTMLHeadingElement>
>(({className, ...props}, ref) => (
    <h2
        ref={ref}
        className={cn(
            'text-lg font-semibold leading-none tracking-tight',
            className
        )}
        {...props}
    />
));
DialogTitle.displayName = 'DialogTitle';

// Dialog description component
const DialogDescription = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLParagraphElement>
>(({className, ...props}, ref) => (
    <p
        ref={ref}
        className={cn('text-sm text-muted-foreground', className)}
        {...props}
    />
));
DialogDescription.displayName = 'DialogDescription';

export {
    Dialog,
    DialogPortal,
    DialogOverlay,
    DialogClose,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription,
};
