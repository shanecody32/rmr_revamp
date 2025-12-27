import {Suspense} from 'react';

import LoadingSpinner from '@/components/common/feedback/LoadingSpinner';
import {PageHeader} from '@/components/layout';

import BandViewContent from './components/BandViewContent';

interface PageParams {
    id: string;
    slug: string;
}

export default async function BandViewPage({
                                               params,
                                           }: {
    params: Promise<PageParams>
}) {
    const resolvedParams = await params;

    return (
        <>
            <PageHeader
                title="Band Details"
                entityName="bands"
                actionName="view"
                entityId={resolvedParams.id}
                entitySlug={resolvedParams.slug}
                backHref="/bands"
                backText="Back to Bands"
            />

            <Suspense fallback={<LoadingSpinner className="min-h-screen"/>}>
                <BandViewContent params={params}/>
            </Suspense>
        </>
    );
}
