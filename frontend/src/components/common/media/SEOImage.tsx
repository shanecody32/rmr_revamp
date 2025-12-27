'use client'

import { Image } from 'antd';
import type { ImageProps } from 'antd';
import * as React from 'react';

import { generateImageSEOAttributes, generateImageStructuredData, type SEOImageData } from '@/lib/utils/seo-image';

interface SEOImageProps extends Omit<ImageProps, 'src' | 'alt'> {
    seoData: SEOImageData;
    variant?: 'original' | 'thumbnail';
    fallbackSrc?: string;
    structuredData?: boolean;
}

export function SEOImage({ 
    seoData, 
    variant = 'original', 
    fallbackSrc = '/images/placeholder.jpg',
    structuredData = true,
    className,
    ...props 
}: SEOImageProps) {
    const [imageSrc, setImageSrc] = React.useState<string>('');
    const [hasError, setHasError] = React.useState(false);
    
    React.useEffect(() => {
        // Generate the image path based on SEO data
        const generateImageSrc = () => {
            const { entityType, entitySlug, bandSlug, bandId, imageType, order } = seoData;
            
            let path = '';
            
            if (entityType === 'band') {
                const bandName = entitySlug.split('-').slice(0, -1).join('-');
                const basePath = `/images/bands/${entitySlug}`;
                
                if (imageType === 'profile') {
                    path = `${basePath}/${bandName}-profile${variant === 'thumbnail' ? '-thumb' : ''}.jpg`;
                } else {
                    path = `${basePath}/${bandName}-${order || 1}${variant === 'thumbnail' ? '-thumb' : ''}.jpg`;
                }
            } else {
                // Album images
                const basePath = `/images/bands/${bandSlug}-${bandId}/albums`;
                const suffix = imageType === 'cover' ? '' : `-${imageType}`;
                const extension = variant === 'thumbnail' ? '.webp' : '.jpg';
                
                path = `${basePath}/${entitySlug}${suffix}${variant === 'thumbnail' ? '-thumb' : ''}${extension}`;
            }
            
            return path;
        };
        
        setImageSrc(generateImageSrc());
    }, [seoData, variant]);
    
    const handleError = () => {
        if (!hasError) {
            setHasError(true);
            setImageSrc(fallbackSrc);
        }
    };

    const handlePreview = React.useCallback(() => {
        // Ant Design Image preview - return higher resolution if available
        return variant === 'thumbnail' ? imageSrc.replace('-thumb', '') : imageSrc;
    }, [imageSrc, variant]);
    
    const imageAttributes = React.useMemo(() => {
        if (!imageSrc) {
            return {
                src: fallbackSrc,
                alt: seoData.alt,
                title: seoData.title ?? seoData.alt,
                'data-entity-type': seoData.entityType,
                'data-entity-id': seoData.entityId,
                'data-image-type': seoData.imageType,
                loading: 'lazy' as const,
                decoding: 'async' as const,
            };
        }

        const imagePath = {
            publicUrl: imageSrc,
            thumbnailUrl: imageSrc.replace('.jpg', '-thumb.webp'),
            directory: '',
            filename: '',
            thumbnailFilename: '',
            fullPath: '',
            thumbnailPath: '',
        };

        return generateImageSEOAttributes(seoData, imagePath);
    }, [fallbackSrc, seoData, imageSrc]);
    
    const structuredDataScript = React.useMemo(() => {
        if (!structuredData || !imageSrc) return null;
        
        const imagePath = {
            publicUrl: imageSrc,
            thumbnailUrl: imageSrc.replace('.jpg', '-thumb.webp'),
            directory: '',
            filename: '',
            thumbnailFilename: '',
            fullPath: '',
            thumbnailPath: '',
        };
        
        const schema = generateImageStructuredData(seoData, imagePath);
        
        return (
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(schema)
                }}
            />
        );
    }, [seoData, imageSrc, structuredData]);
    
    if (!imageSrc) {
        return null;
    }
    
    return (
        <>
            {structuredDataScript}
            <Image
                {...props}
                src={imageSrc}
                alt={imageAttributes.alt}
                title={imageAttributes.title}
                onError={handleError}
                className={className}
                preview={{
                    src: handlePreview(),
                }}
                loading="lazy"
                {...(imageAttributes['data-entity-type'] && {
                    'data-entity-type': imageAttributes['data-entity-type'],
                    'data-entity-id': imageAttributes['data-entity-id'],
                    'data-image-type': imageAttributes['data-image-type'],
                })}
            />
        </>
    );
}

// Convenience components for common use cases
export function BandProfileImage({ 
    bandId, 
    bandSlug, 
    bandName, 
    variant = 'original',
    ...props 
}: {
    bandId: number;
    bandSlug: string;
    bandName: string;
    variant?: 'original' | 'thumbnail';
} & Omit<SEOImageProps, 'seoData'>) {
    const seoData: SEOImageData = {
        entityType: 'band',
        entityId: bandId,
        entitySlug: bandSlug,
        imageType: 'profile',
        alt: `${bandName} profile photo`,
        title: `Official photo of ${bandName}`,
    };
    
    return <SEOImage seoData={seoData} variant={variant} {...props} />;
}

export function AlbumCoverImage({ 
    albumId, 
    albumSlug, 
    albumName, 
    bandId, 
    bandSlug, 
    bandName,
    variant = 'original',
    imageType = 'cover',
    ...props 
}: {
    albumId: number;
    albumSlug: string;
    albumName: string;
    bandId: number;
    bandSlug: string;
    bandName: string;
    variant?: 'original' | 'thumbnail';
    imageType?: 'cover' | 'back' | 'insert';
} & Omit<SEOImageProps, 'seoData'>) {
    const seoData: SEOImageData = {
        entityType: 'album',
        entityId: albumId,
        entitySlug: albumSlug,
        bandSlug,
        bandId,
        imageType,
        alt: `${albumName} ${imageType} by ${bandName}`,
        title: `${albumName} album ${imageType} - ${bandName}`,
    };
    
    return <SEOImage seoData={seoData} variant={variant} {...props} />;
}