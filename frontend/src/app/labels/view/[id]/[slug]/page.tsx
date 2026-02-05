import type {Metadata} from 'next';
import {Suspense} from 'react';

import LoadingSpinner from '@/components/common/feedback/LoadingSpinner';
import {PageHeader} from '@/components/layout';

import LabelViewContent from './components/LabelViewContent';

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
        title: `${name} - Label - RMR Admin`,
        description: `View details for ${name} label`,
    };
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
