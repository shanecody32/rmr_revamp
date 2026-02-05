import { Suspense } from 'react';
import dynamic from 'next/dynamic';

import LoadingSpinner from '@/components/common/feedback/LoadingSpinner';
import { PageHeader } from '@/components/layout';

const StaffPageContent = dynamic(
    () => import('./components/StaffPageContent'),
    { ssr: false }
);

export const metadata = {
    title: 'Staff Members - RMR Admin',
    description: 'Manage staff member records in the Roots Music Report database',
};

export default function StaffPage() {
    return (
        <>
            <PageHeader
                title="Staff Members"
                entityName="staff"
            />
            <Suspense fallback={<LoadingSpinner className="min-h-[50vh]" />}>
                <StaffPageContent />
            </Suspense>
        </>
    );
}
