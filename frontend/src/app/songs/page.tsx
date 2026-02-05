import { Suspense } from 'react';
import dynamic from 'next/dynamic';

import LoadingSpinner from '@/components/common/feedback/LoadingSpinner';
import { PageHeader } from '@/components/layout';

const SongsPageContent = dynamic(
    () => import('./components/SongsPageContent'),
    { ssr: false }
);

export const metadata = {
    title: 'Songs - RMR Admin',
    description: 'Manage song records in the Roots Music Report database',
};

export default function SongsPage() {
    return (
        <>
            <PageHeader
                title="Songs"
                entityName="songs"
            />
            <Suspense fallback={<LoadingSpinner className="min-h-[50vh]" />}>
                <SongsPageContent />
            </Suspense>
        </>
    );
}
