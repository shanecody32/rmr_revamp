/**
 * Global application configuration
 */
export const config = {
    // API configuration
    api: {
        baseUrl: 'http://localhost:8000',
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
        // All media served through the backend /media endpoint
        baseUrl: 'http://localhost:8000/media',
        fallbackImage: 'http://localhost:8000/media/no_image.jpg',
    },

    // Feature flags
    features: {
        charts: false, // Charts functionality is not implemented yet
    },
} as const;

// Type definitions for the config
export type Config = typeof config;