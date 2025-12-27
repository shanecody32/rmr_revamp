# Guide for Updating Imports

This guide provides instructions for updating imports in the codebase to reflect the new directory structure.

## Overview

The project has been restructured to improve organization and maintainability. As a result, many files have been moved
to new locations, and imports need to be updated accordingly.

## General Pattern

The general pattern for updating imports is:

```typescript
// Old import
import { Component } from '@/components/ui/component';

// New import
import { Component } from '@/src/components/ui/category/component';
```

Where `category` is the appropriate category for the component (e.g., `data-display`, `inputs`, `feedback`, etc.).

## UI Components

UI components have been categorized and moved to subdirectories under `src/components/ui`. Here's how to update imports
for different types of UI components:

### Data Display Components

```typescript
// Old import
import { Table } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Chart } from '@/components/ui/chart';

// New import
import { Table } from '@/src/components/ui/data-display/table';
import { Card } from '@/src/components/ui/data-display/card';
import { Chart } from '@/src/components/ui/data-display/chart';
```

### Feedback Components

```typescript
// Old import
import { Alert } from '@/components/ui/alert';
import { Toast } from '@/components/ui/toast';
import { Progress } from '@/components/ui/progress';

// New import
import { Alert } from '@/src/components/ui/feedback/alert';
import { Toast } from '@/src/components/ui/feedback/toast';
import { Progress } from '@/src/components/ui/feedback/progress';
```

### Input Components

```typescript
// Old import
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

// New import
import { Button } from '@/src/components/ui/inputs/button';
import { Input } from '@/src/components/ui/inputs/input';
import { Checkbox } from '@/src/components/ui/inputs/checkbox';
```

### Layout Components

```typescript
// Old import
import {Resizable} from '@/components/ui/resizable';
import {Separator} from '@/components/ui/separator';

// New import
import {Resizable} from '@/src/components/ui/layout/resizable';
import {Separator} from '@/src/components/ui/layout/separator';
```

### Navigation Components

```typescript
// Old import
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Pagination } from '@/components/ui/pagination';

// New import
import { Breadcrumb } from '@/src/components/ui/navigation/breadcrumb';
import { Pagination } from '@/src/components/ui/navigation/pagination';
```

### Overlay Components

```typescript
// Old import
import { Dialog } from '@/components/ui/dialog';
import { Drawer } from '@/components/ui/drawer';
import { Popover } from '@/components/ui/popover';

// New import
import { Dialog } from '@/src/components/ui/overlays/dialog';
import { Drawer } from '@/src/components/ui/overlays/drawer';
import { Popover } from '@/src/components/ui/overlays/popover';
```

## Common Components

Common components have been categorized and moved to subdirectories under `src/components/common`. Here's how to update
imports for different types of common components:

```typescript
// Old import
import { DataTable } from '@/components/common/DataTable';
import { AsyncBoundary } from '@/components/common/AsyncBoundary';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';

// New import
import { DataTable } from '@/src/components/common/data/DataTable';
import { AsyncBoundary } from '@/src/components/common/feedback/AsyncBoundary';
import { Breadcrumbs } from '@/src/components/common/navigation/Breadcrumbs';
```

## Layout Components

Layout components have been moved to `src/components/layout`. Here's how to update imports:

```typescript
// Old import
import {AdminHeader} from '@/components/layout/AdminHeader';
import {PageHeader} from '@/components/layout/PageHeader';

// New import
import {AdminHeader} from '@/src/components/layout/AdminHeader';
import {PageHeader} from '@/src/components/layout/PageHeader';
```

## Feature-Specific Components

Feature-specific components have been moved to their respective feature directories under `src/features`. Here's how to
update imports:

```typescript
// Old import
import { AlbumsList } from '@/components/pages/albums/AlbumsList';
import { BandDetails } from '@/components/pages/bands/BandDetails';

// New import
import { AlbumsList } from '@/src/features/albums/components/AlbumsList';
import { BandDetails } from '@/src/features/bands/components/BandDetails';
```

## Hooks

Hooks have been categorized and moved to subdirectories under `src/hooks`. Here's how to update imports:

```typescript
// Old import
import {useTableData} from '@/hooks/useTableData';
import {useFormSubmit} from '@/hooks/useFormSubmit';
import {useDetailDrawer} from '@/hooks/useDetailDrawer';

// New import
import {useTableData} from '@/src/hooks/table/useTableData';
import {useFormSubmit} from '@/src/hooks/form/useFormSubmit';
import {useDetailDrawer} from '@/src/hooks/ui/useDetailDrawer';
```

## Context Providers

Context providers have been moved to `src/contexts`. Here's how to update imports:

```typescript
// Old import
import { AuthProvider } from '@/contexts/AuthContext';
import { LocationProvider } from '@/contexts/LocationContext';

// New import
import { AuthProvider } from '@/src/contexts/AuthContext';
import { LocationProvider } from '@/src/contexts/LocationContext';
```

## Type Definitions

Type definitions have been moved to `src/types`. Here's how to update imports:

```typescript
// Old import
import { TableProps } from '@/types/table';
import { ApiResponse } from '@/types/api/response';

// New import
import { TableProps } from '@/src/types/table';
import { ApiResponse } from '@/src/types/api/response';
```

## Utility Functions and Services

Utility functions and services have been moved to `src/lib`. Here's how to update imports:

```typescript
// Old import
import { apiClient } from '@/lib/api/client';
import { formatDate } from '@/lib/utils/date';

// New import
import { apiClient } from '@/src/lib/api/client';
import { formatDate } from '@/src/lib/utils/date';
```

## Conclusion

Updating imports is a critical step in completing the restructuring of the project. By following this guide, you can
ensure that all imports are updated correctly, and the application continues to work as expected.

Remember to test the application thoroughly after updating imports to ensure that everything is working correctly.