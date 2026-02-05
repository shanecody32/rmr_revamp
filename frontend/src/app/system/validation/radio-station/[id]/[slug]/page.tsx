import { Suspense } from 'react';

import LoadingSpinner from '@/components/common/feedback/LoadingSpinner';
import { PageHeader } from '@/components/layout';

import RadioStationValidationContent from './components/RadioStationValidationContent';

interface PageParams {
    id: string;
    slug: string;
}

export default async function RadioStationValidationPage({
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
                title={`Validate Station: ${formattedName}`}
                entityName="radio-stations"
                actionName="validate"
                entityId={resolvedParams.id}
                entitySlug={resolvedParams.slug}
                backHref="/radio-stations"
                backText="Back to Radio Stations"
            />
            <Suspense fallback={<LoadingSpinner />}>
                <RadioStationValidationContent id={resolvedParams.id} slug={resolvedParams.slug} />
            </Suspense>
        </>
    );
}
