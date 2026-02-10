import type {Metadata} from 'next';
import {Suspense} from 'react';

import LoadingSpinner from '@/components/common/feedback/LoadingSpinner';
import {PageHeader} from '@/components/layout';

import RadioStationViewContent from './components/RadioStationViewContent';

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
        title: `${name} - Radio Station - RMR Admin`,
        description: `View details for ${name} radio station`,
    };
}

export default async function RadioStationViewPage({
                                                       params,
                                                   }: {
    params: Promise<PageParams>
}) {
    const resolvedParams = await params;

    return (
        <>
            <PageHeader
                title="Radio Station Details"
                entityName="radio-stations"
                actionName="view"
                entityId={resolvedParams.id}
                entitySlug={resolvedParams.slug}
                backHref="/radio-stations"
                backText="Back to Radio Stations"
            />

            <Suspense fallback={<LoadingSpinner className="min-h-screen"/>}>
                <RadioStationViewContent params={params}/>
            </Suspense>
        </>
    );
}
