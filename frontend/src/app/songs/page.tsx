'use client'

import dynamic from 'next/dynamic';

import {PageHeader} from '@/components/layout';

const SongsPageContent = dynamic(
    () => import('./components/SongsPageContent'),
    {ssr: false}
);

export default function SongsPage() {
    return (
        <>
            <PageHeader
                title="Songs"
                entityName="songs"
            />
            <SongsPageContent/>
        </>
    );
}
