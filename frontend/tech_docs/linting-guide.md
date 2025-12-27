# Linting Guide for RMR Admin Frontend

This guide explains how to fix common linting issues in the project.

## Running Lint

To check for linting issues:

```bash
pnpm lint
```

To automatically fix many issues:

```bash
pnpm lint:fix
```

## Common Linting Issues and How to Fix Them

### 1. Unused Variables

**Error:** `'variableName' is defined but never used. @typescript-eslint/no-unused-vars`

**Solutions:**

- Remove the unused variable if it's not needed
- For parameters that are required by the component's interface but not used in the implementation, add an ESLint
  disable comment:
  ```typescript
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function Component({ used, unused }) {
    // Only 'used' is actually used in the component
  }
  ```

### 2. Import Order

**Error:** `'module-a' import should occur before import of 'module-b' import/order`

**Solution:**

- Run `pnpm lint:fix` to automatically fix most import order issues
- If issues persist, manually reorder imports according to the following pattern:
    1. Built-in modules (e.g., 'react', 'next')
    2. External modules (from node_modules)
    3. Internal modules (starting with '@/')
    4. Parent directory imports (starting with '../')
    5. Sibling imports (starting with './')
    6. Index imports

- Make sure to have a blank line between different import groups

### 3. Unexpected 'any' Type

**Error:** `Unexpected any. Specify a different type. @typescript-eslint/no-explicit-any`

**Solution:**

- Create a specific interface or type for the variable instead of using 'any'
- Example:
  ```typescript
  // Instead of:
  function handleData(data: any) { ... }

  // Create a specific type:
  interface DataType {
    id: number;
    name: string;
    // other properties...
  }

  function handleData(data: DataType) { ... }
  ```

### 4. Console Statements

**Error:** `Unexpected console statement. Only these console methods are allowed: warn, error. no-console`

**Solution:**

- Replace `console.log` with `console.warn` or `console.error` if appropriate
- Remove unnecessary console statements
- If a console statement is needed for debugging, consider adding a comment and an ESLint disable:
  ```typescript
  // eslint-disable-next-line no-console
  console.log('Debug info:', data);
  ```

## Example Fix

Here's an example of fixing linting issues in a component:

```typescript
// Before:
import { fetchData } from '@/lib/api';
import { Component } from 'react';
import { unused } from './utils';

export function MyComponent({ id, slug }) {
  // slug is not used
  const handleSubmit = (data: any) => {
    console.log('Submitted:', data);
    fetchData(id, data);
  };
  
  return <div>...</div>;
}

// After:
import { Component } from 'react';

import { fetchData } from '@/lib/api';

interface FormData {
  name: string;
  email: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function MyComponent({ id, slug }) {
  // slug is required by the interface but not used
  const handleSubmit = (data: FormData) => {
    console.warn('Submitted:', data);
    fetchData(id, data);
  };
  
  return <div>...</div>;
}
```

## Conclusion

Following these guidelines will help maintain code quality and consistency throughout the project. If you encounter
linting issues that aren't covered here, please update this guide.