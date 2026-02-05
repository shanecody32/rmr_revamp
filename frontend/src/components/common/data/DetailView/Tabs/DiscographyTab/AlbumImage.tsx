'use client'

import {memo} from 'react';

import ResponsiveImage from '@/components/common/layout/ResponsiveImage';
import {getFallbackImageUrl} from '@/lib/utils/media';

interface AlbumImageProps {
    src?: string | null;
    alt: string;
}

const FALLBACK_IMAGE = getFallbackImageUrl();

const AlbumImage = memo(function AlbumImage({src, alt}: AlbumImageProps) {
    return (
        <div className="flex-shrink-0" style={{width: 96, height: 96}}>
            <ResponsiveImage
                src={src}
                alt={alt}
                fallback={FALLBACK_IMAGE}
                className="rounded"
                objectFit="cover"
                width={96}
                height={96}
                aspectRatio="1/1"
            />
        </div>
    );
});

export default AlbumImage;
