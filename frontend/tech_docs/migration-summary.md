# Migration from shadcn/ui to Ant Design

This document summarizes the changes made to migrate the UI components from shadcn/ui to Ant Design.

## Components Migrated

The following components have been migrated from shadcn/ui to Ant Design:

1. **Alert** - Migrated to use Ant Design's Alert component
2. **Badge** - Migrated to use Ant Design's Badge component
3. **Progress** - Migrated to use Ant Design's Progress component
4. **Toast System** - Migrated to use Ant Design's message and notification APIs
5. **Dialog** - Migrated to use Ant Design's Modal component
6. **Button** - Migrated to use Ant Design's Button component
7. **Input** - Migrated to use Ant Design's Input component
8. **Checkbox** - Migrated to use Ant Design's Checkbox component
9. **Select** - Migrated to use Ant Design's Select component
10. **Card** - Migrated to use Ant Design's Card component

## Migration Approach

The migration approach was to create wrapper components around Ant Design components that maintain the same API as the original shadcn/ui components. This allows for a smoother transition and minimizes the need to update component usage throughout the application.

### Alert Component

The Alert component was migrated to use Ant Design's Alert component. The wrapper maintains the same API as the original shadcn/ui Alert component, including the variant prop for styling.

### Badge Component

The Badge component was migrated to use Ant Design's Badge component. The wrapper maps the shadcn/ui variants to Ant Design colors.

### Progress Component

The Progress component was migrated to use Ant Design's Progress component. The wrapper maps the value prop to Ant Design's percent prop.

### Toast System

The toast system was completely refactored to use Ant Design's message and notification APIs. The use-toast hook was updated to use these APIs directly, and the toast, toaster, and sonner components were simplified to be backward compatible.

### Dialog Component

The Dialog component was migrated to use Ant Design's Modal component. The implementation uses React Context to manage the dialog state, which allows the DialogTrigger and DialogClose components to control the dialog's open state. All sub-components (DialogHeader, DialogFooter, DialogTitle, DialogDescription) were maintained for API compatibility.

### Button Component

The Button component was migrated to use Ant Design's Button component. The wrapper maps shadcn/ui variants and sizes to Ant Design equivalents, while maintaining the original buttonVariants function for compatibility with existing code.

### Input Component

The Input component was migrated to use Ant Design's Input component. The wrapper maintains the same API as the original shadcn/ui Input component.

### Checkbox Component

The Checkbox component was migrated to use Ant Design's Checkbox component. The wrapper maintains the same API as the original shadcn/ui Checkbox component.

### Select Component

The Select component was migrated to use Ant Design's Select component. The implementation is more complex as it needs to maintain compatibility with the original shadcn/ui Select component's API, which includes multiple sub-components like SelectGroup, SelectValue, SelectTrigger, etc.

### Card Component

The Card component was migrated to use Ant Design's Card component. The wrapper maintains the same API as the original shadcn/ui Card component, including all sub-components like CardHeader, CardTitle, CardDescription, CardContent, and CardFooter.

## Future Work

The following components still need to be migrated from shadcn/ui to Ant Design:

1. Remaining components in the inputs directory (form, input-otp, label, radio-group, slider, switch, textarea, toggle, toggle-group)
2. Components in the layout directory
3. Components in the navigation directory
4. Remaining components in the overlays directory (alert-dialog, command, context-menu, drawer, dropdown-menu, hover-card, popover, sheet, tooltip)

## Migration Guidelines

When migrating a component from shadcn/ui to Ant Design, follow these guidelines:

1. Create a wrapper component around the Ant Design component
2. Maintain the same API as the original shadcn/ui component
3. Map shadcn/ui props to Ant Design props
4. Use the cn utility function to combine classnames for styling
5. Add the 'use client' directive at the top of the file for client components
6. Add appropriate TypeScript types for the component props
7. Add appropriate comments to explain the migration
