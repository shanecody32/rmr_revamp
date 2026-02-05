import { Suspense } from 'react';

import LoadingSpinner from '@/components/common/feedback/LoadingSpinner';
import { PageHeader } from '@/components/layout';

import BandValidationContent from './components/BandValidationContent';

interface PageParams {
    id: string;
    slug: string;
}

export default async function BandValidationPage({
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
                title={`Validate Band: ${formattedName}`}
                entityName="bands"
                actionName="validate"
                entityId={resolvedParams.id}
                entitySlug={resolvedParams.slug}
                backHref="/bands"
                backText="Back to Bands"
            />
            <Suspense fallback={<LoadingSpinner />}>
                <BandValidationContent id={resolvedParams.id} slug={resolvedParams.slug} />
            </Suspense>
        </>
    );
}
