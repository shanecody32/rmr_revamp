'use client'

import {Spin} from 'antd';
import dynamic from 'next/dynamic';
import {Suspense} from 'react';

import {PageHeader} from '@/components/layout';

// Use dynamic import with proper loading state
const StaffPageContainer = dynamic(
    () => import('./components/StaffPageContent').then(mod => ({default: mod.default})),
    {
        ssr: false,
        loading: () => (
            <div className="flex items-center justify-center min-h-screen">
                <Spin size="large"/>
            </div>
        ),
    }
);

export default function StaffPage() {
    return (
        <>
            <PageHeader
                title="Staff Members"
                entityName="staff"
            />

            <Suspense fallback={
                <div className="flex items-center justify-center min-h-screen">
                    <Spin size="large"/>
                </div>
            }>
                <StaffPageContainer/>
            </Suspense>
        </>
    );
}
