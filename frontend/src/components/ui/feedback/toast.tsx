'use client'

// This file is now just a re-export of the types from the use-toast hook
// The actual toast implementation is now using Ant Design's message and notification APIs

import type {ToastProps} from '@/hooks/ui/use-toast';

// Define a type for toast actions for backward compatibility
type ToastActionElement = React.ReactElement<{
    altText: string;
    onClick: () => void;
}>;

export {
    type ToastProps,
    type ToastActionElement,
};
