import {Suspense} from 'react';

import LoadingSpinner from '@/components/common/feedback/LoadingSpinner';
import {PageHeader} from '@/components/layout';

import LabelViewContent from './components/LabelViewContent';

interface PageParams {
    id: string;
    slug: string;
}

export default async function LabelViewPage({
    params,
}: {
    params: Promise<PageParams>
}) {
    const resolvedParams = await params;

    return (
        <>
            <PageHeader
                title="Label Details"
                entityName="labels"
                actionName="view"
                entityId={resolvedParams.id}
                entitySlug={resolvedParams.slug}
                backHref="/labels"
                backText="Back to Labels"
            />

            <Suspense fallback={<LoadingSpinner className="min-h-screen"/>}>
                <LabelViewContent params={params}/>
            </Suspense>
        </>
    );
}
