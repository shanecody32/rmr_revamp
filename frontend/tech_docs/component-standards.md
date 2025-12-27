# Component Standards and Best Practices

This document outlines the standards and best practices for component development in our React application. Following
these guidelines will ensure consistency, maintainability, and reusability across the codebase.

## UI Library

We use **Ant Design** as our primary UI component library. All new components should be built using Ant Design components
whenever possible. If a specific UI pattern is not available in Ant Design, create a custom component that follows Ant Design's
design principles and API patterns.

### Ant Design Integration

- Import Ant Design components directly: `import { Button } from 'antd';`
- Use Ant Design's theme customization for consistent styling
- Follow Ant Design's API patterns for props and event handlers
- Wrap Ant Design components when needed to maintain consistent API across the application

## Component Types

### 1. UI Components

UI components are pure presentational components with minimal logic. They should be highly reusable and not contain
business logic or data fetching.

#### Location

```
/components/ui/[category]/[ComponentName].tsx
```

#### Characteristics

- Focus on presentation and styling
- Accept data and callbacks via props
- No direct API calls or complex state management
- Minimal internal state (if any)
- No knowledge of application business logic

#### Example

```tsx
// /components/ui/inputs/button.tsx
import { Button as AntButton } from 'antd';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

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
    isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({className, variant = 'default', size = 'default', isLoading = false, children, ...props}, ref) => {
        // Map shadcn/ui variant to Ant Design type and danger props
        const antType = variant === 'destructive' ? 'primary' : variantMap[variant] || 'default';
        const isDanger = variant === 'destructive';

        // Map shadcn/ui size to Ant Design size
        const antSize = sizeMap[size] || 'middle';

        // For icon buttons, we need to adjust the style
        const isIconButton = size === 'icon';

        return (
            <AntButton
                type={antType as any}
                danger={isDanger}
                size={antSize as any}
                loading={isLoading}
                className={cn(
                    // Apply Tailwind classes for compatibility
                    isIconButton && 'w-10 h-10 p-0 flex items-center justify-center',
                    className
                )}
                ref={ref as any}
                {...props}
            >
                {children}
            </AntButton>
        );
    }
);
Button.displayName = 'Button';
```

### 2. Common Components

Common components are reusable components that may contain some business logic but are still generic enough to be used
across different features.

#### Location

```
/components/common/[ComponentName].tsx
```

#### Characteristics

- May contain some business logic
- May use hooks for state management
- Still relatively generic and reusable
- May combine multiple UI components

#### Example

```tsx
// /components/common/DataTable.tsx
import {Table} from '@/components/ui/data-display/table';
import {Pagination} from '@/components/ui/navigation/pagination';
import {useTableData} from '@/hooks/table/useTableData';

export interface DataTableProps<T> {
    columns: ColumnType<T>[];
    dataSource?: T[];
    loading?: boolean;
    pagination?: {
        current?: number;
        pageSize?: number;
        total?: number;
    };
    onChange?: (pagination, filters, sorter) => void;
}

export function DataTable<T>({
                                 columns,
                                 dataSource,
                                 loading,
                                 pagination,
                                 onChange,
                                 ...props
                             }: DataTableProps<T>) {
    // Some business logic here

    return (
        <div className="data-table-container">
            <Table
                columns={columns}
                dataSource={dataSource}
                loading={loading}
                pagination={false}
                onChange={onChange}
                {...props}
            />
            {pagination && (
                <Pagination
                    current={pagination.current}
                    pageSize={pagination.pageSize}
                    total={pagination.total}
                    onChange={(page, pageSize) => {
                        onChange?.({current: page, pageSize}, null, null);
                    }}
                />
            )}
        </div>
    );
}
```

### 3. Feature Components

Feature components are specific to a particular feature or domain and contain business logic related to that feature.

#### Location

```
/features/[feature-name]/components/[ComponentName].tsx
```

#### Characteristics

- Contain feature-specific business logic
- May make API calls or use data fetching hooks
- Compose UI and common components together
- Implement domain-specific functionality

#### Example

```tsx
// /features/bands/components/BandsList.tsx
import {useState, useEffect} from 'react';
import {DataTable} from '@/components/common/DataTable';
import {Button} from '@/components/ui/inputs/button';
import {useBandsData} from '@/hooks/data/useBandsData';
import {Band} from '@/types/band';

export function BandsList() {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const {data, loading, error, refetch} = useBandsData({page, pageSize});

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            sorter: true,
        },
        {
            title: 'Genre',
            dataIndex: 'genre',
            key: 'genre',
            filters: [/* ... */],
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record: Band) => (
                <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleViewBand(record.id)}
                >
                    View
                </Button>
            ),
        },
    ];

    const handleViewBand = (id: string) => {
        // Navigate to band details page
    };

    const handleTableChange = (pagination, filters, sorter) => {
        setPage(pagination.current);
        setPageSize(pagination.pageSize);
        // Handle filters and sorter
    };

    return (
        <div className="bands-list">
            <h1>Bands</h1>
            <DataTable
                columns={columns}
                dataSource={data?.bands}
                loading={loading}
                pagination={{
                    current: page,
                    pageSize: pageSize,
                    total: data?.total,
                }}
                onChange={handleTableChange}
            />
        </div>
    );
}
```

### 4. Page Components

Page components represent entire pages in the application and are responsible for layout and composition of feature
components.

#### Location

```
/app/[route]/page.tsx
```

#### Characteristics

- Compose feature components together
- Handle page-level layout
- May handle route parameters
- Minimal business logic (delegate to feature components)

#### Example

```tsx
// /app/bands/page.tsx
import {Suspense} from 'react';
import {BandsList} from '@/features/bands/components/BandsList';
import {PageHeader} from '@/components/layout/PageHeader';
import {ErrorBoundary} from '@/components/common/ErrorBoundary';
import {LoadingSpinner} from '@/components/ui/feedback/LoadingSpinner';

export default function BandsPage() {
    return (
        <div className="bands-page">
            <PageHeader title="Bands"/>
            <ErrorBoundary fallback={<div>Something went wrong</div>}>
                <Suspense fallback={<LoadingSpinner/>}>
                    <BandsList/>
                </Suspense>
            </ErrorBoundary>
        </div>
    );
}
```

## Naming Conventions

### Components

- Use PascalCase for component names
- Use descriptive names that indicate the component's purpose
- Suffix test files with `.test.tsx` or `.spec.tsx`

### Props

- Use camelCase for prop names
- Use descriptive names that indicate the prop's purpose
- Group related props in interfaces
- Use consistent naming patterns:
    - `on[Event]` for event handlers (e.g., `onClick`, `onSubmit`)
    - `is[State]` for boolean states (e.g., `isLoading`, `isDisabled`)
    - `has[Feature]` for boolean features (e.g., `hasPagination`)

### Hooks

- Prefix with `use`
- Use camelCase
- Use descriptive names that indicate the hook's purpose
- Group related hooks in directories

## File Structure

### Component File Structure

```tsx
// Imports
import React from 'react';
import { OtherComponent } from './OtherComponent';

// Types
export interface ComponentProps {
  // ...
}

// Helper functions (if small and component-specific)
function helperFunction() {
  // ...
}

// Component
export function Component(props: ComponentProps) {
  // Hooks

  // Derived state

  // Event handlers

  // Render
  return (
    // JSX
  );
}

// Default export (optional)
export default Component;
```

### Directory Structure for Complex Components

```
/ComponentName
  index.ts           // Re-exports
  ComponentName.tsx  // Main component
  ComponentName.module.css  // Styles (if not using Tailwind)
  ComponentName.test.tsx    // Tests
  ComponentName.stories.tsx // Storybook stories
  components/        // Sub-components
    SubComponent.tsx
```

## Best Practices

### 1. Composition over Configuration

- Build complex components by composing smaller ones
- Use children props for flexible content
- Use render props for customization

### 2. Props

- Provide sensible defaults for optional props
- Use destructuring to access props
- Document props with JSDoc comments
- Use TypeScript interfaces for prop types

### 3. State Management

- Keep state as local as possible
- Lift state up only when necessary
- Use context for deeply nested components
- Consider using state management libraries for complex state

### 4. Performance

- Memoize expensive calculations
- Use React.memo for pure components
- Use useCallback for event handlers passed to child components
- Use useMemo for derived values

### 5. Accessibility

- Use semantic HTML elements
- Provide aria attributes
- Ensure keyboard navigation works
- Test with screen readers

### 6. Testing

- Write unit tests for all components
- Test edge cases and error states
- Use testing-library for component testing
- Write integration tests for complex interactions

## Example Component Implementation

```tsx
// /components/ui/data-display/table.tsx
import {Table as AntTable} from 'antd';
import type {TableProps as AntTableProps} from 'antd';
import * as React from 'react';

import {cn} from '@/lib/utils';

// Create a wrapper around Ant Design's Table component
// that maintains the same API as the original Table component

export interface TableProps<T = any> extends Omit<AntTableProps<T>, 'ref'> {
  /**
   * Whether the table has striped rows
   */
  striped?: boolean;
  /**
   * Whether the table has a hover effect on rows
   */
  hover?: boolean;
  /**
   * Whether the table is compact
   */
  compact?: boolean;
}

/**
 * Table component for displaying tabular data
 */
export function Table<T extends object = any>({
  className,
  striped = false,
  hover = false,
  bordered = false,
  compact = false,
  size,
  ...props
}: TableProps<T>) {
  // Map custom props to Ant Design props
  const antSize = compact ? 'small' : size || 'middle';

  return (
    <div className={cn('overflow-x-auto', className)}>
      <AntTable<T>
        bordered={bordered}
        size={antSize}
        className={cn(
          striped && 'ant-table-striped',
          hover && 'ant-table-hover'
        )}
        {...props}
      />
    </div>
  );
}

// Export Ant Table sub-components for convenience
export const {
  Summary: TableSummary,
  SELECTION_COLUMN: TABLE_SELECTION_COLUMN,
  EXPAND_COLUMN: TABLE_EXPAND_COLUMN,
} = AntTable;

// Additional utility components can be added as needed
```

## Conclusion

Following these standards and best practices will ensure a consistent, maintainable, and reusable component library.
These guidelines should be reviewed and updated regularly as the project evolves and new patterns emerge.
