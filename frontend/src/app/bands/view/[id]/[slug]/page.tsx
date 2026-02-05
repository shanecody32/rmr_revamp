import type {Metadata} from 'next';
import {Suspense} from 'react';

import LoadingSpinner from '@/components/common/feedback/LoadingSpinner';
import {PageHeader} from '@/components/layout';

import BandViewContent from './components/BandViewContent';

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
        title: `${name} - Band - RMR Admin`,
        description: `View details for ${name} band`,
    };
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
