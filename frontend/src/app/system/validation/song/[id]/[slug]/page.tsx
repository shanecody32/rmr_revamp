import { Suspense } from 'react';

import LoadingSpinner from '@/components/common/feedback/LoadingSpinner';
import { PageHeader } from '@/components/layout';

import SongValidationContent from './components/SongValidationContent';

interface PageParams {
    id: string;
    slug: string;
}

export default async function SongValidationPage({
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
                title={`Validate Song: ${formattedName}`}
                entityName="songs"
                actionName="validate"
                entityId={resolvedParams.id}
                entitySlug={resolvedParams.slug}
                backHref="/songs"
                backText="Back to Songs"
            />
            <Suspense fallback={<LoadingSpinner />}>
                <SongValidationContent id={resolvedParams.id} slug={resolvedParams.slug} />
            </Suspense>
        </>
    );
}
