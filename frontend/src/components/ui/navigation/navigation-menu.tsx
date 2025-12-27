'use client'

import {DownOutlined} from '@ant-design/icons';
import {Menu as AntMenu} from 'antd';
import type {MenuProps as AntMenuProps} from 'antd';
import {cva} from 'class-variance-authority';
import * as React from 'react';

import {cn} from '@/lib/utils';

// Create a context to manage navigation menu state
type NavigationMenuContextType = {
    activeKey?: string;
    setActiveKey: (key: string) => void;
    openKeys: string[];
    setOpenKeys: (keys: string[]) => void;
};

const NavigationMenuContext = React.createContext<NavigationMenuContextType | undefined>(undefined);

// Define props that match the original component's API
interface NavigationMenuProps extends Omit<AntMenuProps, 'className'> {
    className?: string;
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
    children?: React.ReactNode;
}

const NavigationMenu = React.forwardRef<HTMLDivElement, NavigationMenuProps>(
    ({ className, value, defaultValue, onValueChange, children, ...props }, ref) => {
        // Handle controlled and uncontrolled state
        const [activeKey, setActiveKeyState] = React.useState<string | undefined>(defaultValue);
        const [openKeys, setOpenKeys] = React.useState<string[]>([]);

        const controlledActiveKey = value !== undefined ? value : activeKey;

        const setActiveKey = React.useCallback((key: string) => {
            setActiveKeyState(key);
            onValueChange?.(key);
        }, [onValueChange]);

        return (
            <NavigationMenuContext.Provider value={{ 
                activeKey: controlledActiveKey, 
                setActiveKey, 
                openKeys, 
                setOpenKeys 
            }}>
                <div 
                    ref={ref} 
                    className={cn(
                        'relative z-10 flex max-w-max flex-1 items-center justify-center',
                        className
                    )}
                >
                    {children}
                </div>
            </NavigationMenuContext.Provider>
        );
    }
);
NavigationMenu.displayName = 'NavigationMenu';

// Hook to use navigation menu context
const useNavigationMenuContext = () => {
    const context = React.useContext(NavigationMenuContext);
    if (!context) {
        throw new Error('Navigation Menu components must be used within a NavigationMenu component');
    }
    return context;
};

// List component
interface NavigationMenuListProps extends Omit<AntMenuProps, 'className'> {
    className?: string;
    children?: React.ReactNode;
}

const NavigationMenuList = React.forwardRef<HTMLDivElement, NavigationMenuListProps>(
    ({ className, children, ...props }, ref) => {
        const { activeKey, setActiveKey, openKeys, setOpenKeys } = useNavigationMenuContext();

        const handleMenuClick = ({ key }: { key: string }) => {
            setActiveKey(key);
        };

        const handleOpenChange = (keys: string[]) => {
            setOpenKeys(keys);
        };

        return (
            <AntMenu
                mode="horizontal"
                selectedKeys={activeKey ? [activeKey] : []}
                openKeys={openKeys}
                onOpenChange={handleOpenChange}
                onClick={handleMenuClick}
                className={cn(
                    'group flex flex-1 list-none items-center justify-center space-x-1',
                    className
                )}
                {...props}
            >
                {children}
            </AntMenu>
        );
    }
);
NavigationMenuList.displayName = 'NavigationMenuList';

// Item component
interface NavigationMenuItemProps {
    value?: string;
    className?: string;
    children?: React.ReactNode;
}

const NavigationMenuItem = React.forwardRef<HTMLDivElement, NavigationMenuItemProps>(
    ({ value, className, children, ...props }, ref) => {
        return (
            <AntMenu.Item key={value} className={className} {...props}>
                {children}
            </AntMenu.Item>
        );
    }
);
NavigationMenuItem.displayName = 'NavigationMenuItem';

// Trigger style
const navigationMenuTriggerStyle = cva(
    'group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50'
);

// Trigger component
interface NavigationMenuTriggerProps {
    className?: string;
    children?: React.ReactNode;
}

const NavigationMenuTrigger = React.forwardRef<HTMLDivElement, NavigationMenuTriggerProps>(
    ({ className, children, ...props }, ref) => {
        return (
            <div 
                ref={ref}
                className={cn(navigationMenuTriggerStyle(), 'group', className)}
                {...props}
            >
                {children}{' '}
                <DownOutlined 
                    className="relative top-[1px] ml-1 h-3 w-3 transition duration-200" 
                />
            </div>
        );
    }
);
NavigationMenuTrigger.displayName = 'NavigationMenuTrigger';

// Content component
interface NavigationMenuContentProps {
    className?: string;
    children?: React.ReactNode;
}

const NavigationMenuContent = React.forwardRef<HTMLDivElement, NavigationMenuContentProps>(
    ({ className, children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    'left-0 top-0 w-full md:absolute md:w-auto',
                    className
                )}
                {...props}
            >
                <AntMenu.SubMenu>{children}</AntMenu.SubMenu>
            </div>
        );
    }
);
NavigationMenuContent.displayName = 'NavigationMenuContent';

// Link component
interface NavigationMenuLinkProps {
    href?: string;
    className?: string;
    children?: React.ReactNode;
}

const NavigationMenuLink = React.forwardRef<HTMLAnchorElement, NavigationMenuLinkProps>(
    ({ href, className, children, ...props }, ref) => {
        return (
            <a 
                ref={ref}
                href={href}
                className={className}
                {...props}
            >
                {children}
            </a>
        );
    }
);
NavigationMenuLink.displayName = 'NavigationMenuLink';

// Viewport component (simplified for Ant Design)
interface NavigationMenuViewportProps {
    className?: string;
    children?: React.ReactNode;
}

const NavigationMenuViewport = React.forwardRef<HTMLDivElement, NavigationMenuViewportProps>(
    ({ className, children, ...props }, ref) => {
        return (
            <div 
                ref={ref}
                className={cn('absolute left-0 top-full flex justify-center', className)}
                {...props}
            >
                {children}
            </div>
        );
    }
);
NavigationMenuViewport.displayName = 'NavigationMenuViewport';

// Indicator component (simplified for Ant Design)
interface NavigationMenuIndicatorProps {
    className?: string;
    children?: React.ReactNode;
}

const NavigationMenuIndicator = React.forwardRef<HTMLDivElement, NavigationMenuIndicatorProps>(
    ({ className, children, ...props }, ref) => {
        return (
            <div 
                ref={ref}
                className={cn(
                    'top-full z-[1] flex h-1.5 items-end justify-center overflow-hidden',
                    className
                )}
                {...props}
            >
                <div className="relative top-[60%] h-2 w-2 rotate-45 rounded-tl-sm bg-border shadow-md"/>
            </div>
        );
    }
);
NavigationMenuIndicator.displayName = 'NavigationMenuIndicator';

export {
    navigationMenuTriggerStyle,
    NavigationMenu,
    NavigationMenuList,
    NavigationMenuItem,
    NavigationMenuContent,
    NavigationMenuTrigger,
    NavigationMenuLink,
    NavigationMenuIndicator,
    NavigationMenuViewport,
};
