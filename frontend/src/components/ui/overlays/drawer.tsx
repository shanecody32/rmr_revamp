'use client'

import {Drawer as AntDrawer} from 'antd';
import type {DrawerProps as AntDrawerProps} from 'antd';
import * as React from 'react';

import {cn} from '@/lib/utils';

// Create a context to manage drawer state
type DrawerContextType = {
    open: boolean;
    setOpen: (open: boolean) => void;
    onOpenChange?: (open: boolean) => void;
};

const DrawerContext = React.createContext<DrawerContextType | undefined>(undefined);

// Define props that match the original component's API
interface DrawerProps {
    open?: boolean;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    shouldScaleBackground?: boolean; // For API compatibility, not used
    children?: React.ReactNode;
}

const Drawer = ({
    open: controlledOpen,
    defaultOpen = false,
    onOpenChange,
    shouldScaleBackground = true, // Kept for API compatibility
    children,
    ...props
}: DrawerProps) => {
    // Handle controlled and uncontrolled state
    const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
    const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;

    const setOpen = React.useCallback((newOpen: boolean) => {
        setUncontrolledOpen(newOpen);
        onOpenChange?.(newOpen);
    }, [onOpenChange]);

    return (
        <DrawerContext.Provider value={{ open, setOpen, onOpenChange }}>
            {children}
        </DrawerContext.Provider>
    );
};
Drawer.displayName = 'Drawer';

// Hook to use drawer context
const useDrawerContext = () => {
    const context = React.useContext(DrawerContext);
    if (!context) {
        throw new Error('Drawer components must be used within a Drawer component');
    }
    return context;
};

// Trigger component to open the drawer
interface DrawerTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    asChild?: boolean;
    children?: React.ReactNode;
}

const DrawerTrigger = React.forwardRef<HTMLButtonElement, DrawerTriggerProps>(
    ({ onClick, asChild, children, ...props }, ref) => {
        const { setOpen } = useDrawerContext();

        const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
            onClick?.(e);
            setOpen(true);
        };

        if (asChild && React.isValidElement(children)) {
            return React.cloneElement(children, {
                ...props,
                ref,
                onClick: handleClick,
            } as any);
        }

        return (
            <button ref={ref} onClick={handleClick} {...props}>
                {children}
            </button>
        );
    }
);
DrawerTrigger.displayName = 'DrawerTrigger';

// Portal component (not needed with Ant Design, but kept for API compatibility)
const DrawerPortal = ({ children }: { children: React.ReactNode }) => {
    return <>{children}</>;
};
DrawerPortal.displayName = 'DrawerPortal';

// Close button component
interface DrawerCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    asChild?: boolean;
    children?: React.ReactNode;
}

const DrawerClose = React.forwardRef<HTMLButtonElement, DrawerCloseProps>(
    ({ onClick, asChild, children, ...props }, ref) => {
        const { setOpen } = useDrawerContext();

        const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
            onClick?.(e);
            setOpen(false);
        };

        if (asChild && React.isValidElement(children)) {
            return React.cloneElement(children, {
                ...props,
                ref,
                onClick: handleClick,
            } as any);
        }

        return (
            <button ref={ref} onClick={handleClick} {...props}>
                {children}
            </button>
        );
    }
);
DrawerClose.displayName = 'DrawerClose';

// Overlay component (not needed with Ant Design, but kept for API compatibility)
const DrawerOverlay = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
    return (
        <div
            ref={ref}
            className={cn('fixed inset-0 z-50 bg-black/80', className)}
            {...props}
        />
    );
});
DrawerOverlay.displayName = 'DrawerOverlay';

// Main content component
interface DrawerContentProps extends Omit<AntDrawerProps, 'open'> {
    className?: string;
    children?: React.ReactNode;
}

const DrawerContent = React.forwardRef<HTMLDivElement, DrawerContentProps>(
    ({ className, children, placement = 'bottom', ...props }, ref) => {
        const { open, setOpen } = useDrawerContext();

        // Default styles for bottom placement to match original component
        const defaultStyles = placement === 'bottom' ? {
            borderTopLeftRadius: '10px',
            borderTopRightRadius: '10px',
        } : {};

        return (
            <AntDrawer
                open={open}
                onClose={() => setOpen(false)}
                placement={placement}
                styles={{
                    body: { padding: 0 },
                    wrapper: { ...defaultStyles },
                    ...props.styles,
                }}
                className={cn('bg-background', className)}
                {...props}
            >
                {placement === 'bottom' && (
                    <div className="mx-auto mt-4 h-2 w-[100px] rounded-full bg-muted" />
                )}
                {children}
            </AntDrawer>
        );
    }
);
DrawerContent.displayName = 'DrawerContent';

// Header component
const DrawerHeader = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn('grid gap-1.5 p-4 text-center sm:text-left', className)}
        {...props}
    />
);
DrawerHeader.displayName = 'DrawerHeader';

// Footer component
const DrawerFooter = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn('mt-auto flex flex-col gap-2 p-4', className)}
        {...props}
    />
);
DrawerFooter.displayName = 'DrawerFooter';

// Title component
const DrawerTitle = React.forwardRef<
    HTMLHeadingElement,
    React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
    <h2
        ref={ref}
        className={cn(
            'text-lg font-semibold leading-none tracking-tight',
            className
        )}
        {...props}
    />
));
DrawerTitle.displayName = 'DrawerTitle';

// Description component
const DrawerDescription = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
    <p
        ref={ref}
        className={cn('text-sm text-muted-foreground', className)}
        {...props}
    />
));
DrawerDescription.displayName = 'DrawerDescription';

export {
    Drawer,
    DrawerPortal,
    DrawerOverlay,
    DrawerTrigger,
    DrawerClose,
    DrawerContent,
    DrawerHeader,
    DrawerFooter,
    DrawerTitle,
    DrawerDescription,
};
