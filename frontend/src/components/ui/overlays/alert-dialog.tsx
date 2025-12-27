'use client'

import {Modal} from 'antd';
import type {ModalProps as AntModalProps} from 'antd';
import * as React from 'react';

import {Button} from '@/components/ui/inputs/button';
import {cn} from '@/lib/utils';

// Create wrapper components around Ant Design's Modal component
// that maintain the same API as the original shadcn/ui AlertDialog components

// Context to manage the state of the alert dialog
interface AlertDialogContextProps {
    open: boolean;
    setOpen: (open: boolean) => void;
    title: React.ReactNode;
    setTitle: (title: React.ReactNode) => void;
    description: React.ReactNode;
    setDescription: (description: React.ReactNode) => void;
    onAction: () => void;
    setOnAction: (onAction: () => void) => void;
    onCancel: () => void;
    setOnCancel: (onCancel: () => void) => void;
    actionLabel: React.ReactNode;
    setActionLabel: (actionLabel: React.ReactNode) => void;
    cancelLabel: React.ReactNode;
    setCancelLabel: (cancelLabel: React.ReactNode) => void;
}

const AlertDialogContext = React.createContext<AlertDialogContextProps | undefined>(undefined);

const useAlertDialog = () => {
    const context = React.useContext(AlertDialogContext);
    if (!context) {
        throw new Error('useAlertDialog must be used within an AlertDialogProvider');
    }
    return context;
};

// Main AlertDialog component
interface AlertDialogProps {
    children: React.ReactNode;
    defaultOpen?: boolean;
}

const AlertDialog: React.FC<AlertDialogProps> = ({children, defaultOpen = false}) => {
    const [open, setOpen] = React.useState(defaultOpen);
    const [title, setTitle] = React.useState<React.ReactNode>('');
    const [description, setDescription] = React.useState<React.ReactNode>('');
    const [onAction, setOnAction] = React.useState<() => void>(() => {});
    const [onCancel, setOnCancel] = React.useState<() => void>(() => {});
    const [actionLabel, setActionLabel] = React.useState<React.ReactNode>('Continue');
    const [cancelLabel, setCancelLabel] = React.useState<React.ReactNode>('Cancel');

    return (
        <AlertDialogContext.Provider
            value={{
                open,
                setOpen,
                title,
                setTitle,
                description,
                setDescription,
                onAction,
                setOnAction,
                onCancel,
                setOnCancel,
                actionLabel,
                setActionLabel,
                cancelLabel,
                setCancelLabel,
            }}
        >
            {children}
            <Modal
                title={title}
                open={open}
                onOk={() => {
                    onAction();
                    setOpen(false);
                }}
                onCancel={() => {
                    onCancel();
                    setOpen(false);
                }}
                okText={actionLabel}
                cancelText={cancelLabel}
                centered
            >
                {description}
            </Modal>
        </AlertDialogContext.Provider>
    );
};

// Trigger component
interface AlertDialogTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    asChild?: boolean;
}

const AlertDialogTrigger: React.FC<AlertDialogTriggerProps> = ({
                                                                   onClick,
                                                                   children,
                                                                   ...props
                                                               }) => {
    const {setOpen} = useAlertDialog();

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        setOpen(true);
        onClick?.(e);
    };

    return (
        <Button onClick={handleClick} {...props}>
            {children}
        </Button>
    );
};

// Placeholder components for compatibility
const AlertDialogPortal: React.FC<{children: React.ReactNode}> = ({children}) => <>{children}</>;
const AlertDialogOverlay: React.FC = () => null;

// Content component
interface AlertDialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
}

const AlertDialogContent: React.FC<AlertDialogContentProps> = ({children}) => {
    return <>{children}</>;
};

// Header component
interface AlertDialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
}

const AlertDialogHeader: React.FC<AlertDialogHeaderProps> = ({children}) => {
    return <>{children}</>;
};

// Footer component
interface AlertDialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
}

const AlertDialogFooter: React.FC<AlertDialogFooterProps> = ({children}) => {
    return <>{children}</>;
};

// Title component
interface AlertDialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
    children: React.ReactNode;
}

const AlertDialogTitle: React.FC<AlertDialogTitleProps> = ({children}) => {
    const {setTitle} = useAlertDialog();
    const mounted = React.useRef(true);

    React.useEffect(() => {
        return () => {
            mounted.current = false;
        };
    }, []);

    React.useEffect(() => {
        if (mounted.current) {
            setTitle(children);
        }
    }, [children, setTitle]);

    return null;
};

// Description component
interface AlertDialogDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
    children: React.ReactNode;
}

const AlertDialogDescription: React.FC<AlertDialogDescriptionProps> = ({children}) => {
    const {setDescription} = useAlertDialog();
    const mounted = React.useRef(true);

    React.useEffect(() => {
        return () => {
            mounted.current = false;
        };
    }, []);

    React.useEffect(() => {
        if (mounted.current) {
            setDescription(children);
        }
    }, [children, setDescription]);

    return null;
};

// Action component
interface AlertDialogActionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
}

const AlertDialogAction: React.FC<AlertDialogActionProps> = ({onClick, children}) => {
    const {setOnAction, setActionLabel} = useAlertDialog();
    const mounted = React.useRef(true);

    React.useEffect(() => {
        return () => {
            mounted.current = false;
        };
    }, []);

    React.useEffect(() => {
        if (mounted.current) {
            setActionLabel(children);
        }
    }, [children, setActionLabel]);

    React.useEffect(() => {
        if (mounted.current && onClick) {
            setOnAction(() => onClick as () => void);
        }
    }, [onClick, setOnAction]);

    return null;
};

// Cancel component
interface AlertDialogCancelProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
}

const AlertDialogCancel: React.FC<AlertDialogCancelProps> = ({onClick, children}) => {
    const {setOnCancel, setCancelLabel} = useAlertDialog();
    const mounted = React.useRef(true);

    React.useEffect(() => {
        return () => {
            mounted.current = false;
        };
    }, []);

    React.useEffect(() => {
        if (mounted.current) {
            setCancelLabel(children);
        }
    }, [children, setCancelLabel]);

    React.useEffect(() => {
        if (mounted.current && onClick) {
            setOnCancel(() => onClick as () => void);
        }
    }, [onClick, setOnCancel]);

    return null;
};

export {
    AlertDialog,
    AlertDialogPortal,
    AlertDialogOverlay,
    AlertDialogTrigger,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogFooter,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogAction,
    AlertDialogCancel,
};
