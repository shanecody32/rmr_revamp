import {config} from '../config';

/**
 * Gets a proxied URL for an image to bypass CORS restrictions
 *
 * @param url The original image URL
 * @returns The proxied URL
 */
export function getProxiedImageUrl(url: string): string {
    if (!url) return getFallbackImageUrl();

    // If we're in development/preview and the URL doesn't already use our proxy
    if (!url.includes('/api/image-proxy')) {
        return `/api/image-proxy?url=${encodeURIComponent(url)}`;
    }

    return url;
}

/**
 * Builds a complete image URL from a path and filename
 *
 * @param path The relative path to the image (may include leading/trailing slashes)
 * @param filename The filename of the image
 * @returns The complete URL to the image
 */
export function buildImageUrl(path?: string | null, filename?: string | null): string {
    if (!filename) return getFallbackImageUrl();

    // Clean path by removing leading/trailing slashes
    const cleanPath = path ? path.replace(/^\/+|\/+$/g, '') : '';

    // Combine base URL, path (if any), and filename
    const url = cleanPath
        ? `${config.media.imagePath}${cleanPath}/${filename}`
        : `${config.media.imagePath}${filename}`;

    // Return the proxied URL to bypass CORS
    return getProxiedImageUrl(url);
}

/**
 * Gets image URL for a band image
 *
 * @param bandImage The band image object containing path and filename
 * @param useThumb Whether to use the thumbnail instead of the full image
 * @returns The complete URL to the image
 */
export function getBandImageUrl(
    bandImage: { path?: string | null; filename?: string | null; thumbname?: string | null } | null | undefined,
    useThumb: boolean = false
): string {
    if (!bandImage) return getFallbackImageUrl();

    const imageName = useThumb && bandImage.thumbname ? bandImage.thumbname : bandImage.filename;
    if (!imageName) return getFallbackImageUrl();

    // For band images stored locally, build URL directly without proxy
    if (bandImage.path?.startsWith('images/bands/')) {
        const cleanPath = bandImage.path.replace(/^\/+|\/+$/g, '');
        return `/${cleanPath}/${imageName}`;
    }

    // For external images, use the original build function with proxy
    return buildImageUrl(bandImage.path, imageName);
}

/**
 * Gets image URL for an album image
 *
 * @param imgPath The image path string
 * @returns The complete URL to the image
 */
export function getAlbumImageUrl(imgPath?: string | null): string {
    if (!imgPath) return getFallbackImageUrl();

    // If the image path is already a full URL
    if (imgPath.startsWith('http://') || imgPath.startsWith('https://')) {
        return getProxiedImageUrl(imgPath);
    }

    // Otherwise, build the URL using the config and proxy it
    const fullUrl = `${config.media.imagePath}${imgPath}`;
    return getProxiedImageUrl(fullUrl);
}

/**
 * Gets a fallback image URL
 *
 * @returns The fallback image URL
 */
export function getFallbackImageUrl(): string {
    return getProxiedImageUrl(config.media.fallbackImage);
}