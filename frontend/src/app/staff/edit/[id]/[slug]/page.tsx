import {Suspense} from 'react';

import LoadingSpinner from '@/components/common/feedback/LoadingSpinner';
import {PageHeader} from '@/components/layout';

import StaffEditContent from './components/StaffEditContent';

interface PageParams {
    id: string;
    slug: string;
}

export default async function StaffEditPage({
    params
}: {
    params: Promise<PageParams>
}) {
    const resolvedParams = await params;
    const formattedName = resolvedParams.slug
        .split('-')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

    return (
        <>
            <PageHeader
                title={`Edit Staff: ${formattedName}`}
                entityName="staff"
                actionName="edit"
                entityId={resolvedParams.id}
                entitySlug={resolvedParams.slug}
                backHref="/staff"
                backText="Back to Staff"
            />
            <Suspense fallback={<LoadingSpinner/>}>
                <StaffEditContent id={resolvedParams.id} slug={resolvedParams.slug}/>
            </Suspense>
        </>
    );
}
