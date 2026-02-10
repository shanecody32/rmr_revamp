import { Suspense } from 'react';

import LoadingSpinner from '@/components/common/feedback/LoadingSpinner';
import { PageHeader } from '@/components/layout';
import BandsPageContent from './components/BandsPageContent';

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
