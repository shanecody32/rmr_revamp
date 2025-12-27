'use client'

import dynamic from 'next/dynamic';

import {PageHeader} from '@/components/layout';

const AlbumsPageContent = dynamic(
    () => import('./components/AlbumsPageContent'),
    {ssr: false}
);

export default function AlbumsPage() {
    return (
        <>
            <PageHeader
                title="Albums"
                entityName="albums"
            />
            <AlbumsPageContent/>
        </>
    );
}
