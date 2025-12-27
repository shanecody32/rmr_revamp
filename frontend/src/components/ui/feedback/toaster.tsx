'use client'

// This component is now just an empty component for backward compatibility
// The actual toast implementation is now using Ant Design's message and notification APIs
// which don't require a provider component

export function Toaster() {
    // Ant Design's message and notification APIs are automatically available
    // throughout the application without needing a provider
    return null;
}
