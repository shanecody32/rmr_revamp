'use client'

import {Spin} from 'antd';
import dynamic from 'next/dynamic';
import {Suspense} from 'react';

import {PageHeader} from '@/components/layout';

// Use dynamic import with proper loading state - Updated to use collocated components
const BandsPageContainer = dynamic(
    () => import('./components/BandsPageContent').then(mod => ({ default: mod.default })),
    {
        ssr: false,
        loading: () => (
            <div className="flex items-center justify-center min-h-screen">
                <Spin size="large"/>
            </div>
        ),
    }
);

export default function BandsPage() {
    return (
        <>
            <PageHeader
                title="Bands"
                entityName="bands"
            />

            <Suspense fallback={
                <div className="flex items-center justify-center min-h-screen">
                    <Spin size="large"/>
                </div>
            }>
                <BandsPageContainer/>
            </Suspense>
        </>
    );
}
