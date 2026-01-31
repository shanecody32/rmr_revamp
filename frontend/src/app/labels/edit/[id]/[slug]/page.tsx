import {Suspense} from 'react';

import LoadingSpinner from '@/components/common/feedback/LoadingSpinner';
import {PageHeader} from '@/components/layout';

import LabelEditContent from './components/LabelEditContent';

interface PageParams {
    id: string;
    slug: string;
}

export default async function LabelEditPage({
    params,
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
                title={`Edit Label: ${formattedName}`}
                entityName="labels"
                actionName="edit"
                entityId={resolvedParams.id}
                entitySlug={resolvedParams.slug}
                backHref="/labels"
                backText="Back to Labels"
            />
            <Suspense fallback={<LoadingSpinner />}>
                <LabelEditContent id={resolvedParams.id} slug={resolvedParams.slug} />
            </Suspense>
        </>
    );
}
