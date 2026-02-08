import { describe, it, expect } from 'vitest';
import {
    getMediaUrl,
    buildImageUrl,
    getBandImageUrl,
    getStaffImageUrl,
    getAlbumDisplayImageUrl,
    getAlbumImageUrl,
    resolveBackendImageUrl,
    getFallbackImageUrl,
} from '../utils/media';

const FALLBACK = getFallbackImageUrl();
const MEDIA_BASE = 'http://localhost:8000/media';
const API_BASE = 'http://localhost:8000';

// ─── getMediaUrl ───────────────────────────────────────────────────

describe('getMediaUrl', () => {
    it('returns fallback for empty string', () => {
        expect(getMediaUrl('')).toBe(FALLBACK);
    });

    it('strips img/ prefix from path', () => {
        const url = getMediaUrl('img/bands/willie-nelson-65/');
        expect(url).toBe(`${MEDIA_BASE}/bands/willie-nelson-65`);
        expect(url).not.toContain('img/');
    });

    it('adds w and h query params', () => {
        const url = getMediaUrl('bands/photo.jpg', { w: 100, h: 50 });
        expect(url).toContain('?w=100&h=50');
    });

    it('omits query string when no params', () => {
        const url = getMediaUrl('bands/photo.jpg');
        expect(url).not.toContain('?');
    });
});

// ─── buildImageUrl ─────────────────────────────────────────────────

describe('buildImageUrl', () => {
    it('returns fallback when no filename', () => {
        expect(buildImageUrl('some/path', null)).toBe(FALLBACK);
        expect(buildImageUrl('some/path', undefined)).toBe(FALLBACK);
    });

    it('combines path and filename', () => {
        const url = buildImageUrl('bands/photos', 'photo.jpg');
        expect(url).toBe(`${MEDIA_BASE}/bands/photos/photo.jpg`);
    });

    it('uses filename only when path is empty', () => {
        const url = buildImageUrl('', 'photo.jpg');
        expect(url).toBe(`${MEDIA_BASE}/photo.jpg`);
    });

    it('uses filename only when path is null', () => {
        const url = buildImageUrl(null, 'photo.jpg');
        expect(url).toBe(`${MEDIA_BASE}/photo.jpg`);
    });
});

// ─── getBandImageUrl ───────────────────────────────────────────────

describe('getBandImageUrl', () => {
    it('returns fallback for null', () => {
        expect(getBandImageUrl(null)).toBe(FALLBACK);
    });

    it('returns fallback for undefined', () => {
        expect(getBandImageUrl(undefined)).toBe(FALLBACK);
    });

    it('uses thumbname when useThumb=true', () => {
        const url = getBandImageUrl(
            { path: 'bands/', filename: 'full.jpg', thumbname: 'thumb.jpg' },
            true
        );
        expect(url).toContain('thumb.jpg');
        expect(url).not.toContain('full.jpg');
    });

    it('uses filename when no thumbname even with useThumb=true', () => {
        const url = getBandImageUrl(
            { path: 'bands/', filename: 'full.jpg', thumbname: null },
            true
        );
        expect(url).toContain('full.jpg');
    });

    it('uses filename when useThumb=false', () => {
        const url = getBandImageUrl(
            { path: 'bands/', filename: 'full.jpg', thumbname: 'thumb.jpg' },
            false
        );
        expect(url).toContain('full.jpg');
    });

    it('returns fallback when filename and thumbname are both null', () => {
        expect(getBandImageUrl({ path: 'bands/', filename: null, thumbname: null })).toBe(FALLBACK);
    });
});

// ─── getStaffImageUrl ──────────────────────────────────────────────

describe('getStaffImageUrl', () => {
    it('returns fallback for null', () => {
        expect(getStaffImageUrl(null)).toBe(FALLBACK);
    });

    it('uses thumbname when useThumb=true', () => {
        const url = getStaffImageUrl(
            { path: 'staff/', filename: 'full.jpg', thumbname: 'thumb.jpg' },
            true
        );
        expect(url).toContain('thumb.jpg');
    });

    it('uses filename when useThumb=false', () => {
        const url = getStaffImageUrl(
            { path: 'staff/', filename: 'full.jpg', thumbname: 'thumb.jpg' },
            false
        );
        expect(url).toContain('full.jpg');
    });
});

// ─── getAlbumDisplayImageUrl ───────────────────────────────────────

describe('getAlbumDisplayImageUrl', () => {
    it('prefers image_url field', () => {
        const url = getAlbumDisplayImageUrl({
            image_url: '/media/albums/cover.jpg',
            images: [{ path: 'albums/', filename: 'other.jpg' }],
        });
        expect(url).toBe(`${API_BASE}/media/albums/cover.jpg`);
    });

    it('falls back to images array when no image_url', () => {
        const url = getAlbumDisplayImageUrl({
            images: [{ path: 'albums/', filename: 'cover.jpg', thumbname: 'thumb.jpg' }],
        });
        expect(url).toContain('thumb.jpg');
    });

    it('falls back to album.img external URL as-is', () => {
        const url = getAlbumDisplayImageUrl({
            img: 'https://example.com/album.jpg',
        });
        expect(url).toBe('https://example.com/album.jpg');
    });

    it('routes album.img relative path through /media/', () => {
        const url = getAlbumDisplayImageUrl({
            img: 'img/albums/old-cover.jpg',
        });
        expect(url).toBe(`${MEDIA_BASE}/albums/old-cover.jpg`);
    });

    it('returns fallback when nothing available', () => {
        expect(getAlbumDisplayImageUrl({})).toBe(FALLBACK);
    });

    it('skips images with no filename', () => {
        const url = getAlbumDisplayImageUrl({
            images: [{ path: 'albums/', filename: null }],
            img: 'img/albums/fallback.jpg',
        });
        expect(url).toContain('fallback.jpg');
    });
});

// ─── getAlbumImageUrl ──────────────────────────────────────────────

describe('getAlbumImageUrl', () => {
    it('returns fallback for null', () => {
        expect(getAlbumImageUrl(null)).toBe(FALLBACK);
    });

    it('returns full URL as-is', () => {
        expect(getAlbumImageUrl('https://example.com/img.jpg')).toBe('https://example.com/img.jpg');
    });

    it('routes relative path through media endpoint', () => {
        const url = getAlbumImageUrl('img/albums/cover.jpg');
        expect(url).toBe(`${MEDIA_BASE}/albums/cover.jpg`);
    });
});

// ─── resolveBackendImageUrl ────────────────────────────────────────

describe('resolveBackendImageUrl', () => {
    it('returns fallback for null', () => {
        expect(resolveBackendImageUrl(null)).toBe(FALLBACK);
    });

    it('returns fallback for undefined', () => {
        expect(resolveBackendImageUrl(undefined)).toBe(FALLBACK);
    });

    it('returns full URL as-is', () => {
        expect(resolveBackendImageUrl('https://cdn.example.com/img.jpg')).toBe('https://cdn.example.com/img.jpg');
    });

    it('prepends backend base URL for /media/ paths', () => {
        expect(resolveBackendImageUrl('/media/albums/cover.jpg')).toBe(`${API_BASE}/media/albums/cover.jpg`);
    });

    it('routes other relative paths through media endpoint', () => {
        const url = resolveBackendImageUrl('albums/cover.jpg');
        expect(url).toBe(`${MEDIA_BASE}/albums/cover.jpg`);
    });
});
