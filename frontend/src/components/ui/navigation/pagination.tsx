import {Pagination as AntPagination} from 'antd';
import type {PaginationProps as AntPaginationProps} from 'antd';
import {ChevronLeft, ChevronRight, MoreHorizontal} from 'lucide-react';
import * as React from 'react';

import {ButtonProps, buttonVariants} from '@/components/ui/inputs/button';
import {cn} from '@/lib/utils';

// Create wrapper components around Ant Design's Pagination component
// that maintain the same API as the original shadcn/ui Pagination components

// Main Pagination component that wraps Ant Design's Pagination
interface PaginationProps extends Omit<React.ComponentProps<'nav'>, 'onChange'> {
    current?: number;
    defaultCurrent?: number;
    total?: number;
    pageSize?: number;
    defaultPageSize?: number;
    onChange?: (page: number, pageSize: number) => void;
}

const Pagination = ({
                        className,
                        current,
                        defaultCurrent,
                        total,
                        pageSize,
                        defaultPageSize,
                        onChange,
                        ...props
                    }: PaginationProps) => {
    // If pagination props are provided, render Ant Design's Pagination
    if (current !== undefined || defaultCurrent !== undefined || total !== undefined) {
        return (
            <nav
                role="navigation"
                aria-label="pagination"
                className={cn('mx-auto flex w-full justify-center', className)}
                {...props}
            >
                <AntPagination
                    current={current}
                    defaultCurrent={defaultCurrent}
                    total={total}
                    pageSize={pageSize}
                    defaultPageSize={defaultPageSize}
                    onChange={onChange}
                />
            </nav>
        );
    }

    // Otherwise, render a traditional nav element for compatibility
    return (
        <nav
            role="navigation"
            aria-label="pagination"
            className={cn('mx-auto flex w-full justify-center', className)}
            {...props}
        />
    );
};
Pagination.displayName = 'Pagination';

// Keep the other pagination components for compatibility
const PaginationContent = React.forwardRef<
    HTMLUListElement,
    React.ComponentProps<'ul'>
>(({className, ...props}, ref) => (
    <ul
        ref={ref}
        className={cn('flex flex-row items-center gap-1', className)}
        {...props}
    />
));
PaginationContent.displayName = 'PaginationContent';

const PaginationItem = React.forwardRef<
    HTMLLIElement,
    React.ComponentProps<'li'>
>(({className, ...props}, ref) => (
    <li ref={ref} className={cn('', className)} {...props} />
));
PaginationItem.displayName = 'PaginationItem';

type PaginationLinkProps = {
    isActive?: boolean;
} & Pick<ButtonProps, 'size'> &
    React.ComponentProps<'a'>;

const PaginationLink = ({
                            className,
                            isActive,
                            size = 'icon',
                            ...props
                        }: PaginationLinkProps) => (
    <a
        aria-current={isActive ? 'page' : undefined}
        className={cn(
            buttonVariants({
                variant: isActive ? 'outline' : 'ghost',
                size,
            }),
            className
        )}
        {...props}
    />
);
PaginationLink.displayName = 'PaginationLink';

const PaginationPrevious = ({
                                className,
                                ...props
                            }: React.ComponentProps<typeof PaginationLink>) => (
    <PaginationLink
        aria-label="Go to previous page"
        size="default"
        className={cn('gap-1 pl-2.5', className)}
        {...props}
    >
        <ChevronLeft className="h-4 w-4"/>
        <span>Previous</span>
    </PaginationLink>
);
PaginationPrevious.displayName = 'PaginationPrevious';

const PaginationNext = ({
                            className,
                            ...props
                        }: React.ComponentProps<typeof PaginationLink>) => (
    <PaginationLink
        aria-label="Go to next page"
        size="default"
        className={cn('gap-1 pr-2.5', className)}
        {...props}
    >
        <span>Next</span>
        <ChevronRight className="h-4 w-4"/>
    </PaginationLink>
);
PaginationNext.displayName = 'PaginationNext';

const PaginationEllipsis = ({
                                className,
                                ...props
                            }: React.ComponentProps<'span'>) => (
    <span
        aria-hidden
        className={cn('flex h-9 w-9 items-center justify-center', className)}
        {...props}
    >
    <MoreHorizontal className="h-4 w-4"/>
    <span className="sr-only">More pages</span>
  </span>
);
PaginationEllipsis.displayName = 'PaginationEllipsis';

export {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
};
