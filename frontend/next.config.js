/** @type {import('next').NextConfig} */
const nextConfig = {
    productionBrowserSourceMaps: false,
    // Configure Turbopack
    turbopack: {
        resolveAlias: {
            underscore: 'lodash',
            mocha: { browser: 'mocha/browser-entry.js' },
        },
    },
    images: {
        unoptimized: true,
        remotePatterns: [
            {
                protocol: 'http',
                hostname: 'localhost',
                port: '8000',
                pathname: '/media/**',
            },
            {
                protocol: 'https',
                hostname: 'api.dicebear.com',
            },
        ],
    },
    // Ensure DOCTYPE is included in the HTML output
    experimental: {
    },
};

module.exports = nextConfig;
