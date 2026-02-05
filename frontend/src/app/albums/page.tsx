import { Suspense } from 'react';
import dynamic from 'next/dynamic';

import LoadingSpinner from '@/components/common/feedback/LoadingSpinner';
import { PageHeader } from '@/components/layout';

const AlbumsPageContent = dynamic(
    () => import('./components/AlbumsPageContent'),
    { ssr: false }
);

export const metadata = {
    title: 'Albums - RMR Admin',
    description: 'Manage album records in the Roots Music Report database',
};

export default function AlbumsPage() {
    return (
        <>
            <PageHeader
                title="Albums"
                entityName="albums"
            />
            <Suspense fallback={<LoadingSpinner className="min-h-[50vh]" />}>
                <AlbumsPageContent />
            </Suspense>
        </>
    );
}
