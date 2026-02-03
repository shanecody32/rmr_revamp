import {Suspense} from 'react';

import LoadingSpinner from '@/components/common/feedback/LoadingSpinner';
import {PageHeader} from '@/components/layout';

import SongViewContent from './components/SongViewContent';

interface PageParams {
    id: string;
    slug: string;
}

export default async function SongViewPage({
    params,
}: {
    params: Promise<PageParams>
}) {
    const resolvedParams = await params;

    return (
        <>
            <PageHeader
                title="Song Details"
                entityName="songs"
                actionName="view"
                entityId={resolvedParams.id}
                entitySlug={resolvedParams.slug}
                backHref="/songs"
                backText="Back to Songs"
            />

            <Suspense fallback={<LoadingSpinner className="min-h-screen"/>}>
                <SongViewContent params={params}/>
            </Suspense>
        </>
    );
}
