import { Suspense } from 'react';
import dynamic from 'next/dynamic';

import LoadingSpinner from '@/components/common/feedback/LoadingSpinner';
import { PageHeader } from '@/components/layout';

const BandsPageContent = dynamic(
    () => import('./components/BandsPageContent'),
    { ssr: false }
);

export const metadata = {
    title: 'Bands - RMR Admin',
    description: 'Manage band records in the Roots Music Report database',
};

export default function BandsPage() {
    return (
        <>
            <PageHeader
                title="Bands"
                entityName="bands"
            />
            <Suspense fallback={<LoadingSpinner className="min-h-[50vh]" />}>
                <BandsPageContent />
            </Suspense>
        </>
    );
}
