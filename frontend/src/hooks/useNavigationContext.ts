'use client'

import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

/**
 * Navigation context configuration for different source pages.
 * Maps the `from` query parameter to back navigation details.
 */
const NAVIGATION_CONTEXTS: Record<string, {
    backHref: string;
    backText: string;
    breadcrumbLabel: string;
}> = {
    duplicates: {
        backHref: '/bands/duplicates',
        backText: 'Back to Duplicate Check',
        breadcrumbLabel: 'Duplicate Check',
    },
    bands: {
        backHref: '/bands',
        backText: 'Back to Bands',
        breadcrumbLabel: 'Bands',
    },
    albums: {
        backHref: '/albums',
        backText: 'Back to Albums',
        breadcrumbLabel: 'Albums',
    },
    songs: {
        backHref: '/songs',
        backText: 'Back to Songs',
        breadcrumbLabel: 'Songs',
    },
    'radio-stations': {
        backHref: '/radio-stations',
        backText: 'Back to Radio Stations',
        breadcrumbLabel: 'Radio Stations',
    },
    staff: {
        backHref: '/staff',
        backText: 'Back to Staff',
        breadcrumbLabel: 'Staff',
    },
    'staff-duplicates': {
        backHref: '/staff/duplicates',
        backText: 'Back to Staff Duplicate Check',
        breadcrumbLabel: 'Staff Duplicate Check',
    },
};

export interface NavigationContext {
    /** The source page identifier (e.g., 'duplicates', 'bands') */
    from: string | null;
    /** The href to navigate back to */
    backHref: string;
    /** The text to display on the back button */
    backText: string;
    /** The label to show in breadcrumbs for the source page */
    breadcrumbLabel: string;
    /** Whether navigation context exists (from parameter was provided) */
    hasContext: boolean;
    /**
     * Create a URL with the current navigation context preserved.
     * Use this when navigating to sub-pages to maintain the back chain.
     */
    createContextualHref: (baseHref: string) => string;
    /**
     * Get query string to append to URLs (e.g., "?from=duplicates")
     */
    getQueryString: () => string;
}

/**
 * Hook to manage contextual navigation.
 *
 * Reads the `from` query parameter to determine where the user came from,
 * and provides appropriate back navigation details.
 *
 * @param defaultContext - The default context if no `from` parameter is present
 * @returns Navigation context with back href, text, and breadcrumb info
 *
 * @example
 * // In a band view page
 * const nav = useNavigationContext('bands');
 *
 * // If user came from /bands/duplicates?..., nav.backHref will be '/bands/duplicates'
 * // If user came from /bands, nav.backHref will be '/bands'
 *
 * <PageHeader backHref={nav.backHref} backText={nav.backText} />
 */
export function useNavigationContext(defaultContext: string = 'bands'): NavigationContext {
    const searchParams = useSearchParams();

    return useMemo(() => {
        const from = searchParams.get('from');
        const contextKey = from || defaultContext;
        const context = NAVIGATION_CONTEXTS[contextKey] || NAVIGATION_CONTEXTS[defaultContext] || {
            backHref: '/',
            backText: 'Back',
            breadcrumbLabel: 'Home',
        };

        return {
            from,
            backHref: context.backHref,
            backText: context.backText,
            breadcrumbLabel: context.breadcrumbLabel,
            hasContext: !!from,
            createContextualHref: (baseHref: string) => {
                if (!from) return baseHref;
                const separator = baseHref.includes('?') ? '&' : '?';
                return `${baseHref}${separator}from=${from}`;
            },
            getQueryString: () => from ? `?from=${from}` : '',
        };
    }, [searchParams, defaultContext]);
}

/**
 * Build a URL with navigation context.
 *
 * @param baseHref - The base URL path
 * @param from - The source context identifier
 * @returns URL with from parameter appended
 *
 * @example
 * buildContextualHref('/bands/view/123/my-band', 'duplicates')
 * // Returns: '/bands/view/123/my-band?from=duplicates'
 */
export function buildContextualHref(baseHref: string, from: string): string {
    const separator = baseHref.includes('?') ? '&' : '?';
    return `${baseHref}${separator}from=${from}`;
}
