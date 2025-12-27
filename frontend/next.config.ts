import type { NextConfig } from "next";

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
        unoptimized: false,
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'rootsmusicreport.com',
                pathname: '/img/**',
            },
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
            },
            {
                protocol: 'https',
                hostname: 'api.dicebear.com',
            },
            {
                protocol: 'https',
                hostname: '**.mzstatic.com',
            },
            {
                protocol: 'http',
                hostname: '**.mzstatic.com',
            },
            {
                protocol: 'https',
                hostname: '**.media-amazon.com',
            },
            {
                protocol: 'https',
                hostname: '**.scdn.co',
            },
            {
                protocol: 'https',
                hostname: '**.spotify.com',
            },
            {
                protocol: 'https',
                hostname: '**.archive.org',
            },
        ],
    },
    // Ensure DOCTYPE is included in the HTML output
};

export default nextConfig;
