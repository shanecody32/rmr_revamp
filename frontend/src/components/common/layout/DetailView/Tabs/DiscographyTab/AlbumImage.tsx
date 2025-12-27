'use client'

import ResponsiveImage from '@/components/common/layout/ResponsiveImage';
import {getFallbackImageUrl} from '@/lib/utils/media';

interface AlbumImageProps {
    src?: string | null;
    alt: string;
}

const FALLBACK_IMAGE = getFallbackImageUrl();

export default function AlbumImage({src, alt}: AlbumImageProps) {
    return (
        <div className="w-24 h-24 flex-shrink-0">
            <ResponsiveImage
                src={src}
                alt={alt}
                fallback={FALLBACK_IMAGE}
                className="w-full h-full rounded"
                objectFit="cover"
            />
        </div>
    );
}
