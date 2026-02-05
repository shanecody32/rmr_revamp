import type {Metadata} from 'next';
import {Suspense} from 'react';

import LoadingSpinner from '@/components/common/feedback/LoadingSpinner';
import {PageHeader} from '@/components/layout';

import SongViewContent from './components/SongViewContent';

interface PageParams {
    id: string;
    slug: string;
}

function formatSlug(slug: string): string {
    return slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

export async function generateMetadata({params}: {params: Promise<PageParams>}): Promise<Metadata> {
    const {slug} = await params;
    const name = formatSlug(slug);
    return {
        title: `${name} - Song - RMR Admin`,
        description: `View details for ${name} song`,
    };
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
