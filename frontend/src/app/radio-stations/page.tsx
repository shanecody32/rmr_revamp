import { Suspense } from 'react';

import LoadingSpinner from '@/components/common/feedback/LoadingSpinner';
import { PageHeader } from '@/components/layout';
import RadioStationsPageContent from './components/RadioStationsPageContent';

export const metadata = {
    title: 'Radio Stations - RMR Admin',
    description: 'Manage radio station records in the Roots Music Report database',
};

export default function RadioStationsPage() {
    return (
        <>
            <PageHeader
                title="Radio Stations"
                entityName="radio-stations"
            />
            <Suspense fallback={<LoadingSpinner className="min-h-[50vh]" />}>
                <RadioStationsPageContent />
            </Suspense>
        </>
    );
}
