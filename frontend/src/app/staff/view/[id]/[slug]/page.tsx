import type {Metadata} from 'next';
import {Suspense} from 'react';

import LoadingSpinner from '@/components/common/feedback/LoadingSpinner';
import {PageHeader} from '@/components/layout';

import StaffViewContent from './components/StaffViewContent';

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
        title: `${name} - Staff - RMR Admin`,
        description: `View details for ${name} staff member`,
    };
}

export default async function StaffViewPage({
    params,
}: {
    params: Promise<PageParams>
}) {
    const resolvedParams = await params;

    return (
        <>
            <PageHeader
                title="Staff Member Details"
                entityName="staff"
                actionName="view"
                entityId={resolvedParams.id}
                entitySlug={resolvedParams.slug}
                backHref="/staff"
                backText="Back to Staff"
            />

            <Suspense fallback={<LoadingSpinner className="min-h-screen"/>}>
                <StaffViewContent params={params}/>
            </Suspense>
        </>
    );
}
