'use client'

import {Avatar as AntAvatar} from 'antd';
import * as React from 'react';

import {cn} from '@/lib/utils';

// Create wrapper components around Ant Design's Avatar component
// that maintain the same API as the original shadcn/ui Avatar components

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
    src?: string;
    alt?: string;
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
    ({className, children, ...props}, ref) => (
        <div
            ref={ref}
            className={cn(
                'relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full',
                className
            )}
            {...props}
        >
            {children}
        </div>
    )
);
Avatar.displayName = 'Avatar';

interface AvatarImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string;
    alt?: string;
}

const AvatarImage = React.forwardRef<HTMLImageElement, AvatarImageProps>(
    ({className, src, alt, onClick, onError, ...props}, ref) => {
        // Extract onClick to avoid type mismatch with AntAvatar
        const handleClick = onClick ? (e: any) => onClick(e as React.MouseEvent<HTMLImageElement>) : undefined;

        // Extract onError to avoid type mismatch with AntAvatar
        // AntAvatar expects onError to return a boolean
        const handleError = onError ? () => {
            onError({} as React.SyntheticEvent<HTMLImageElement, Event>);
            return true; // Return true to prevent default error behavior
        } : undefined;

        return (
            <AntAvatar
                src={src}
                alt={alt}
                className={cn('aspect-square h-full w-full', className)}
                ref={ref as any}
                onClick={handleClick}
                onError={handleError}
                {...props}
            />
        );
    }
);
AvatarImage.displayName = 'AvatarImage';

type AvatarFallbackProps = React.HTMLAttributes<HTMLDivElement>

const AvatarFallback = React.forwardRef<HTMLDivElement, AvatarFallbackProps>(
    ({className, children, onClick, onError, ...props}, ref) => {
        // Extract onClick to avoid type mismatch with AntAvatar
        const handleClick = onClick ? (e: any) => onClick(e as React.MouseEvent<HTMLDivElement>) : undefined;

        // Extract onError to avoid type mismatch with AntAvatar
        // AntAvatar expects onError to return a boolean
        const handleError = onError ? () => {
            onError({} as React.SyntheticEvent<HTMLDivElement, Event>);
            return true; // Return true to prevent default error behavior
        } : undefined;

        return (
            <AntAvatar
                icon={children}
                className={cn(
                    'flex h-full w-full items-center justify-center rounded-full bg-muted',
                    className
                )}
                ref={ref as any}
                onClick={handleClick}
                onError={handleError}
                {...props}
            />
        );
    }
);
AvatarFallback.displayName = 'AvatarFallback';

export {Avatar, AvatarImage, AvatarFallback};
