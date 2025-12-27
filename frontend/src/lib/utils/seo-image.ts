'use client'

export interface SEOImageData {
    entityType: 'band' | 'album';
    entityId: number;
    entitySlug: string;
    bandSlug?: string; // For albums
    bandId?: number;   // For albums
    imageType: 'profile' | 'gallery' | 'cover' | 'back' | 'insert';
    order?: number;    // For gallery images
    alt: string;
    title?: string;
}

export interface ImagePath {
    directory: string;
    filename: string;
    thumbnailFilename: string;
    fullPath: string;
    thumbnailPath: string;
    publicUrl: string;
    thumbnailUrl: string;
}

/**
 * Generate SEO-friendly image paths that maintain the current structure
 */
export function generateSEOImagePath(data: SEOImageData): ImagePath {
    const { entityType, entitySlug, bandSlug, bandId, imageType, order } = data;
    
    let directory: string;
    let baseFilename: string;
    
    if (entityType === 'band') {
        // Band images: /bands/{band-slug-id}/
        directory = `bands/${entitySlug}`;
        
        if (imageType === 'profile') {
            baseFilename = `${entitySlug.split('-').slice(0, -1).join('-')}-profile`;
        } else {
            // Gallery images: willie-nelson-1, willie-nelson-2
            const bandName = entitySlug.split('-').slice(0, -1).join('-');
            baseFilename = `${bandName}-${order || 1}`;
        }
    } else {
        // Album images: /bands/{band-slug-id}/albums/
        if (!bandSlug || !bandId) {
            throw new Error('Band information required for album images');
        }
        
        directory = `bands/${bandSlug}-${bandId}/albums`;
        
        if (imageType === 'cover') {
            baseFilename = entitySlug;
        } else {
            baseFilename = `${entitySlug}-${imageType}`;
        }
    }
    
    const filename = `${baseFilename}.jpg`; // Default to jpg
    const thumbnailFilename = `${baseFilename}-thumb.webp`;
    const fullPath = `${directory}/${filename}`;
    const thumbnailPath = `${directory}/${thumbnailFilename}`;
    
    return {
        directory,
        filename,
        thumbnailFilename,
        fullPath,
        thumbnailPath,
        publicUrl: `/images/${fullPath}`,
        thumbnailUrl: `/images/${thumbnailPath}`,
    };
}

/**
 * Generate structured data for images (SEO)
 */
export function generateImageStructuredData(data: SEOImageData, imagePath: ImagePath) {
    const baseStructuredData = {
        "@type": "ImageObject",
        "url": imagePath.publicUrl,
        "thumbnail": imagePath.thumbnailUrl,
        "name": data.alt,
        "description": data.title || data.alt,
        "encodingFormat": "image/jpeg",
    };
    
    if (data.entityType === 'album') {
        return {
            ...baseStructuredData,
            "@context": "https://schema.org",
            "associatedMedia": {
                "@type": "MusicAlbum",
                "name": data.alt.split(' by ')[0], // Extract album name
                "byArtist": {
                    "@type": "MusicGroup",
                    "name": data.alt.split(' by ')[1], // Extract artist name
                }
            }
        };
    }
    
    return baseStructuredData;
}

/**
 * Generate SEO-optimized image attributes
 */
export function generateImageSEOAttributes(data: SEOImageData, imagePath: ImagePath) {
    return {
        src: imagePath.publicUrl,
        alt: data.alt,
        title: data.title,
        'data-entity-type': data.entityType,
        'data-entity-id': data.entityId,
        'data-image-type': data.imageType,
        loading: 'lazy' as const,
        decoding: 'async' as const,
    };
}

/**
 * Legacy path converter for migrating old images
 */
export function convertLegacyPath(legacyPath: string): string {
    // Convert old public paths to new secure paths
    if (legacyPath.startsWith('/img/')) {
        return legacyPath.replace('/img/', '/images/');
    }
    return legacyPath;
}

/**
 * Extract SEO data from image path
 */
export function extractSEODataFromPath(path: string): Partial<SEOImageData> | null {
    const match = path.match(/\/images\/bands\/([^\/]+)\/(?:albums\/)?([^\/]+)\.(jpg|png|webp)/);
    
    if (!match) return null;
    
    const [, bandSlugId, filename] = match;
    const isAlbum = path.includes('/albums/');
    
    if (isAlbum) {
        return {
            entityType: 'album',
            bandSlug: bandSlugId.split('-').slice(0, -1).join('-'),
            bandId: parseInt(bandSlugId.split('-').pop() || '0'),
            entitySlug: filename.replace(/-(back|insert|thumb)$/, ''),
            imageType: filename.includes('-back') ? 'back' : 
                      filename.includes('-insert') ? 'insert' : 'cover',
        };
    } else {
        return {
            entityType: 'band',
            entitySlug: bandSlugId,
            imageType: filename.includes('-profile') ? 'profile' : 'gallery',
        };
    }
}