import { Suspense } from 'react';
import dynamic from 'next/dynamic';

import LoadingSpinner from '@/components/common/feedback/LoadingSpinner';
import { PageHeader } from '@/components/layout';

const LabelPageContent = dynamic(
    () => import('./components/LabelPageContent'),
    { ssr: false }
);

export const metadata = {
    title: 'Labels - RMR Admin',
    description: 'Manage record label records in the Roots Music Report database',
};

export default function LabelsPage() {
    return (
        <>
            <PageHeader
                title="Labels"
                entityName="labels"
            />
            <Suspense fallback={<LoadingSpinner className="min-h-[50vh]" />}>
                <LabelPageContent />
            </Suspense>
        </>
    );
}
