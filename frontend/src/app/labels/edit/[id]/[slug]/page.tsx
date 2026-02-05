import type {Metadata} from 'next';
import {Suspense} from 'react';

import LoadingSpinner from '@/components/common/feedback/LoadingSpinner';
import {PageHeader} from '@/components/layout';

import LabelEditContent from './components/LabelEditContent';

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
        title: `Edit ${name} - Label - RMR Admin`,
        description: `Edit details for ${name} label`,
    };
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
