import { Suspense } from 'react';

import LoadingSpinner from '@/components/common/feedback/LoadingSpinner';
import { PageHeader } from '@/components/layout';
import AlbumsPageContent from './components/AlbumsPageContent';

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
