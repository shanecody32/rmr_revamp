'use client'

import {Spin} from 'antd';
import Image from 'next/image';
import {useEffect, useState} from 'react';

import {getFallbackImageUrl} from '@/lib/utils/media';

const FALLBACK_IMAGE = getFallbackImageUrl();

interface ResponsiveImageProps {
    src: string | null | undefined;
    alt: string;
    fallback?: string;
    className?: string;
    objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
    aspectRatio?: string | number;
    width?: string | number;
    height?: string | number;
    onLoad?: () => void;
    onError?: () => void;
}

export default function ResponsiveImage({
                                            src,
                                            alt,
                                            fallback = FALLBACK_IMAGE,
                                            className = '',
                                            objectFit = 'cover',
                                            aspectRatio,
                                            width,
                                            height,
                                            onLoad,
                                            onError,
                                        }: ResponsiveImageProps) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [imgSrc, setImgSrc] = useState<string | null | undefined>(src);

    useEffect(() => {
        // Reset state when src changes
        setImgSrc(src);
        setLoading(true);
        setError(false);
    }, [src]);

    const handleLoad = () => {
        setLoading(false);
        setError(false);
        onLoad?.();
    };

    const handleError = () => {
        console.warn(`Image error loading: ${imgSrc}`);
        setLoading(false);
        setError(true);
        setImgSrc(fallback);
        onError?.();
    };

    const imageStyles: React.CSSProperties = {
        objectFit,
        ...(aspectRatio ? {aspectRatio: typeof aspectRatio === 'number' ? `${aspectRatio}` : aspectRatio} : {}),
        ...(width ? {width: typeof width === 'number' ? `${width}px` : width} : {}),
        ...(height ? {height: typeof height === 'number' ? `${height}px` : height} : {}),
    };

    return (
        <div className={`relative image-container ${className}`} style={{minHeight: '40px'}}>
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
                    <Spin size="small"/>
                </div>
            )}
            <Image
                src={error ? fallback : (imgSrc || fallback)}
                alt={alt}
                className={`w-full h-full transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}
                style={imageStyles}
                onLoad={handleLoad}
                onError={handleError}
                {...(!width && !height
                    ? { fill: true }
                    : {
                        width: width ? (typeof width === 'number' ? width : 500) : 500,
                        height: height ? (typeof height === 'number' ? height : 300) : 300,
                      }
                )}
            />
        </div>
    );
}
