import {Suspense} from 'react';

import LoadingSpinner from '@/components/common/feedback/LoadingSpinner';
import {PageHeader} from '@/components/layout';

import StaffViewContent from './components/StaffViewContent';

interface PageParams {
    id: string;
    slug: string;
}

export default async function StaffViewPage({
    params,
}: {
    params: Promise<PageParams>
}) {
    const resolvedParams = await params;

    return (
        <>
            <PageHeader
                title="Staff Member Details"
                entityName="staff"
                actionName="view"
                entityId={resolvedParams.id}
                entitySlug={resolvedParams.slug}
                backHref="/staff"
                backText="Back to Staff"
            />

            <Suspense fallback={<LoadingSpinner className="min-h-screen"/>}>
                <StaffViewContent params={params}/>
            </Suspense>
        </>
    );
}
