import { Suspense } from 'react';

import LoadingSpinner from '@/components/common/feedback/LoadingSpinner';
import { PageHeader } from '@/components/layout';

import StaffValidationContent from './components/StaffValidationContent';

interface PageParams {
    id: string;
    slug: string;
}

export default async function StaffValidationPage({
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
                title={`Validate Staff: ${formattedName}`}
                entityName="staff"
                actionName="validate"
                entityId={resolvedParams.id}
                entitySlug={resolvedParams.slug}
                backHref="/staff"
                backText="Back to Staff"
            />
            <Suspense fallback={<LoadingSpinner />}>
                <StaffValidationContent id={resolvedParams.id} slug={resolvedParams.slug} />
            </Suspense>
        </>
    );
}
