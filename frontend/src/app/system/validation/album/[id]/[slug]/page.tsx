import { Suspense } from 'react';

import LoadingSpinner from '@/components/common/feedback/LoadingSpinner';
import { PageHeader } from '@/components/layout';

import AlbumValidationContent from './components/AlbumValidationContent';

interface PageParams {
    id: string;
    slug: string;
}

export default async function AlbumValidationPage({
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
                title={`Validate Album: ${formattedName}`}
                entityName="albums"
                actionName="validate"
                entityId={resolvedParams.id}
                entitySlug={resolvedParams.slug}
                backHref="/albums"
                backText="Back to Albums"
            />
            <Suspense fallback={<LoadingSpinner />}>
                <AlbumValidationContent id={resolvedParams.id} slug={resolvedParams.slug} />
            </Suspense>
        </>
    );
}
