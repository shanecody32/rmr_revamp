'use client'

import {Drawer, Typography} from 'antd';
import type {DrawerProps as AntDrawerProps} from 'antd';
import {cva, type VariantProps} from 'class-variance-authority';
import {X} from 'lucide-react';
import * as React from 'react';

import {cn} from '@/lib/utils';

// Create wrapper components around Ant Design's Drawer component
// that maintain a similar API to the original Radix UI Sheet components

// Context to manage the sheet state
const SheetContext = React.createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
  onOpenChange?: (open: boolean) => void;
}>({
  open: false,
  setOpen: () => {},
});

// Main Sheet component
interface SheetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

const Sheet = ({open = false, onOpenChange, children}: SheetProps) => {
  const [isOpen, setIsOpen] = React.useState(open);

  React.useEffect(() => {
    setIsOpen(open);
  }, [open]);

  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  return (
    <SheetContext.Provider value={{open: isOpen, setOpen: handleOpenChange, onOpenChange}}>
      {children}
    </SheetContext.Provider>
  );
};

// Sheet trigger component
interface SheetTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  children?: React.ReactNode;
}

const SheetTrigger = React.forwardRef<HTMLButtonElement, SheetTriggerProps>(
  ({asChild = false, children, ...props}, ref) => {
    const {setOpen} = React.useContext(SheetContext);

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
SheetTrigger.displayName = 'SheetTrigger';

// Sheet close button
interface SheetCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  children?: React.ReactNode;
}

const SheetClose = React.forwardRef<HTMLButtonElement, SheetCloseProps>(
  ({asChild = false, children, ...props}, ref) => {
    const {setOpen} = React.useContext(SheetContext);

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
SheetClose.displayName = 'SheetClose';

// This is a no-op component for API compatibility
const SheetPortal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

// This is a no-op component for API compatibility
const SheetOverlay: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => {
  return <div className={cn('fixed inset-0 z-50 bg-black/80', className)} {...props} />;
};
SheetOverlay.displayName = 'SheetOverlay';

// Map the side variants to Ant Design's placement
type SheetSide = 'top' | 'right' | 'bottom' | 'left';

interface SheetContentProps extends Omit<AntDrawerProps, 'open' | 'onClose'> {
  side?: SheetSide;
  className?: string;
  children?: React.ReactNode;
}

const SheetContent = React.forwardRef<HTMLDivElement, SheetContentProps>(
  ({side = 'right', className, children, ...props}, ref) => {
    const {open, setOpen} = React.useContext(SheetContext);

    // Map side to Ant Design's placement
    const placement = side as AntDrawerProps['placement'];

    return (
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        placement={placement}
        closable={true}
        closeIcon={<X className="h-4 w-4" />}
        className={cn('p-0', className)}
        {...props}
      >
        <div ref={ref} className="relative">
          {children}
        </div>
      </Drawer>
    );
  }
);
SheetContent.displayName = 'SheetContent';

const SheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col space-y-2 text-center sm:text-left',
      className
    )}
    {...props}
  />
);
SheetHeader.displayName = 'SheetHeader';

const SheetFooter = ({
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
SheetFooter.displayName = 'SheetFooter';

// Title component using Ant Design's Typography
const SheetTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({className, ...props}, ref) => (
  <Typography.Title
    level={4}
    ref={ref}
    className={cn('text-lg font-semibold text-foreground', className)}
    {...props}
  />
));
SheetTitle.displayName = 'SheetTitle';

// Description component using Ant Design's Typography
const SheetDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({className, ...props}, ref) => (
  <Typography.Paragraph
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
SheetDescription.displayName = 'SheetDescription';

export {
    Sheet,
    SheetPortal,
    SheetOverlay,
    SheetTrigger,
    SheetClose,
    SheetContent,
    SheetHeader,
    SheetFooter,
    SheetTitle,
    SheetDescription,
};
