'use client'

import {Suspense} from 'react';

import {ErrorBoundary} from '@/components/providers/ErrorBoundary';

import LoadingSpinner from './LoadingSpinner';

interface AsyncBoundaryProps {
    children: React.ReactNode;
}

export default function AsyncBoundary({children}: AsyncBoundaryProps) {
    return (
        <ErrorBoundary>
            <Suspense fallback={<LoadingSpinner className="min-h-[200px]"/>}>
                {children}
            </Suspense>
        </ErrorBoundary>
    );
}