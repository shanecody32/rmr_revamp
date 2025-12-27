/**
 * Global application configuration
 */
export const config = {
    // API configuration
    api: {
        baseUrl: 'http://localhost:5151/api',
        timeout: 30000, // 30 seconds
        retries: 3, // Number of retries for failed requests
    },

    // Application settings
    app: {
        name: 'RMR Admin',
        description: 'Roots Music Report Admin Dashboard',
    },

    // Media configuration
    media: {
        // Base URL for all images (Next.js serves from public directory at root)
        imagePath: '/',
        fallbackImage: 'https://www.rootsmusicreport.com/img/no_image.jpg',
    },

    // Feature flags
    features: {
        charts: false, // Charts functionality is not implemented yet
    },
} as const;

// Type definitions for the config
export type Config = typeof config;