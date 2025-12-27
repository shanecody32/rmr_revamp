'use client'

import {message, notification} from 'antd';
import type {ArgsProps as MessageArgsProps} from 'antd/es/message';
import type {ArgsProps as NotificationArgsProps} from 'antd/es/notification';
import * as React from 'react';

// Create a wrapper around Ant Design's message and notification APIs
// that maintains a similar API to the original toast implementation

// Define types for the toast API
export type ToastProps = {
    variant?: 'default' | 'destructive';
    title?: React.ReactNode;
    description?: React.ReactNode;
    duration?: number;
    onClose?: () => void;
};

// Map to store active toast IDs
const activeToasts = new Map<string, string>();

// Generate a unique ID for each toast
let count = 0;
function genId() {
    count = (count + 1) % Number.MAX_SAFE_INTEGER;
    return count.toString();
}

// Function to show a toast notification
function toast(props: ToastProps) {
    const {
        variant = 'default',
        title,
        description,
        duration = 3,
        onClose,
    } = props;

    const id = genId();

    // Determine which Ant Design component to use based on the presence of a title
    if (title && description) {
        // Use notification for toasts with both title and description
        const type = variant === 'destructive' ? 'error' : 'info';

        const notificationProps: NotificationArgsProps = {
            message: title,
            description,
            duration,
            onClose,
            key: id,
        };

        notification[type](notificationProps);
        activeToasts.set(id, 'notification');
    } else {
        // Use message for simple toasts
        const type = variant === 'destructive' ? 'error' : 'info';
        const content = title || description;

        const messageProps: MessageArgsProps = {
            content,
            duration,
            onClose,
            key: id,
        };

        message[type](messageProps);
        activeToasts.set(id, 'message');
    }

    return {
        id,
        dismiss: () => dismiss(id),
        // Simple update function that just shows a new toast
        update: (newProps: ToastProps) => {
            dismiss(id);
            return toast(newProps);
        },
    };
}

// Function to dismiss a toast
function dismiss(id?: string) {
    if (id) {
        const type = activeToasts.get(id);
        if (type === 'notification') {
            notification.destroy(id);
        } else if (type === 'message') {
            message.destroy(id);
        }
        activeToasts.delete(id);
    } else {
        // Dismiss all toasts
        notification.destroy();
        message.destroy();
        activeToasts.clear();
    }
}

// Hook to use the toast API
function useToast() {
    return {
        toast,
        dismiss,
    };
}

export {useToast, toast};
