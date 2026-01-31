import {config} from '../config';

/**
 * Builds a media URL through the backend /media endpoint.
 * Strips the "img/" prefix from database paths since the backend proxy
 * re-adds it when proxying to production.
 *
 * @param path Path from database (e.g., "img/bands/willie-nelson-65/")
 * @param options Optional thumbnail dimensions
 * @returns Full media URL
 */
export function getMediaUrl(path: string, options?: { w?: number; h?: number }): string {
    if (!path) return getFallbackImageUrl();

    // Strip leading slashes and "img/" prefix from DB paths
    let cleanPath = path.replace(/^\/+/, '').replace(/^img\//, '');
    // Strip trailing slashes
    cleanPath = cleanPath.replace(/\/+$/, '');

    let url = `${config.media.baseUrl}/${cleanPath}`;

    if (options?.w || options?.h) {
        const params = new URLSearchParams();
        if (options.w) params.set('w', options.w.toString());
        if (options.h) params.set('h', options.h.toString());
        url += `?${params.toString()}`;
    }

    return url;
}

/**
 * Builds a complete image URL from a path and filename.
 * Routes through the backend /media endpoint.
 *
 * @param path The relative path from the database (may include "img/" prefix)
 * @param filename The filename of the image
 * @returns The complete URL to the image
 */
export function buildImageUrl(path?: string | null, filename?: string | null): string {
    if (!filename) return getFallbackImageUrl();

    // Clean path: remove leading/trailing slashes and "img/" prefix
    let cleanPath = path ? path.replace(/^\/+|\/+$/g, '').replace(/^img\//, '') : '';

    const fullPath = cleanPath ? `${cleanPath}/${filename}` : filename;
    return `${config.media.baseUrl}/${fullPath}`;
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

    return buildImageUrl(bandImage.path, imageName);
}

/**
 * Gets image URL for a staff image
 *
 * @param staffImage The staff image object containing path and filename
 * @param useThumb Whether to use the thumbnail instead of the full image
 * @returns The complete URL to the image
 */
export function getStaffImageUrl(
    staffImage: { path?: string | null; filename?: string | null; thumbname?: string | null } | null | undefined,
    useThumb: boolean = false
): string {
    if (!staffImage) return getFallbackImageUrl();

    const imageName = useThumb && staffImage.thumbname ? staffImage.thumbname : staffImage.filename;
    if (!imageName) return getFallbackImageUrl();

    return buildImageUrl(staffImage.path, imageName);
}

/**
 * Gets image URL for an album, using the fallback chain:
 * 1. album_images table (via images array) - preferred
 * 2. album.img field (external link from old system)
 * 3. Fallback placeholder
 *
 * // TODO: Improve image handling - album.img is an external link from the old system.
 * // In the future, all images should come from the album_images table exclusively.
 *
 * @param album Object with optional images array and img field
 * @param useThumb Whether to prefer thumbnail over full image
 * @returns The best available image URL
 */
export function getAlbumDisplayImageUrl(
    album: {
        images?: Array<{ path?: string | null; filename?: string | null; thumbname?: string | null }> | null;
        img?: string | null;
        image_url?: string | null;
    },
    useThumb: boolean = true
): string {
    // If the backend already resolved image_url (AlbumSummary), use it
    if (album.image_url) {
        return resolveBackendImageUrl(album.image_url);
    }

    // Check album_images table first
    if (album.images && album.images.length > 0) {
        const firstImage = album.images[0];
        const imageName = useThumb && firstImage.thumbname ? firstImage.thumbname : firstImage.filename;
        if (imageName) {
            return buildImageUrl(firstImage.path, imageName);
        }
    }

    // Fall back to album.img (external link from old system)
    if (album.img) {
        // If it's already a full URL, return as-is
        if (album.img.startsWith('http://') || album.img.startsWith('https://')) {
            return album.img;
        }
        // Otherwise route through /media/
        const cleanPath = album.img.replace(/^\/+/, '').replace(/^img\//, '');
        return `${config.media.baseUrl}/${cleanPath}`;
    }

    return getFallbackImageUrl();
}

/**
 * Gets image URL for an album image path string.
 *
 * @param imgPath The image path string (full path from DB including filename)
 * @returns The complete URL to the image
 */
export function getAlbumImageUrl(imgPath?: string | null): string {
    if (!imgPath) return getFallbackImageUrl();

    // If it's already a full URL, just return it
    if (imgPath.startsWith('http://') || imgPath.startsWith('https://')) {
        return imgPath;
    }

    // Strip leading slashes and "img/" prefix
    const cleanPath = imgPath.replace(/^\/+/, '').replace(/^img\//, '');
    return `${config.media.baseUrl}/${cleanPath}`;
}

/**
 * Resolves an image URL returned by the backend.
 * Backend returns relative paths like "/media/..." which need the backend base URL prepended.
 * Already-absolute URLs (http/https) are returned as-is.
 *
 * @param url The image URL from the backend API response
 * @returns A fully qualified URL the browser can load
 */
export function resolveBackendImageUrl(url: string | null | undefined): string {
    if (!url) return getFallbackImageUrl();

    // Already a full URL
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }

    // Relative /media/ path from backend - prepend backend base
    if (url.startsWith('/media/')) {
        return `${config.api.baseUrl}${url}`;
    }

    // Other relative paths - route through media endpoint
    const cleanPath = url.replace(/^\/+/, '').replace(/^img\//, '');
    return `${config.media.baseUrl}/${cleanPath}`;
}

/**
 * Gets a fallback image URL
 *
 * @returns The fallback image URL
 */
export function getFallbackImageUrl(): string {
    return config.media.fallbackImage;
}

/**
 * Gets a proxied URL for an image.
 * @deprecated Use getMediaUrl, buildImageUrl, or entity-specific helpers instead.
 * Kept for backward compatibility during migration.
 */
export function getProxiedImageUrl(url: string): string {
    if (!url) return getFallbackImageUrl();

    // If it's a relative path, route through backend media endpoint
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        const cleanPath = url.replace(/^\/+/, '').replace(/^img\//, '');
        return `${config.media.baseUrl}/${cleanPath}`;
    }

    // For absolute URLs, return as-is (the backend proxy handles CORS)
    return url;
}
