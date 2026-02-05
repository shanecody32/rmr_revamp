import type { Metadata } from 'next';
import { Suspense } from 'react';

import LoadingSpinner from '@/components/common/feedback/LoadingSpinner';
import { PageHeader } from '@/components/layout';

import PlaylistViewContent from './components/PlaylistViewContent';

interface PageParams {
    id: string;
    slug: string;
}

function formatSlug(slug: string): string {
    return slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

export async function generateMetadata({ params }: { params: Promise<PageParams> }): Promise<Metadata> {
    const { slug } = await params;
    const name = formatSlug(slug);
    return {
        title: `${name}'s Playlist - RMR Admin`,
        description: `View playlist for ${name}`,
    };
}

export default async function StaffPlaylistViewPage({
    params,
}: {
    params: Promise<PageParams>;
}) {
    const resolvedParams = await params;

    return (
        <>
            <PageHeader
                title="Staff Playlist"
                entityName="staff"
                actionName="playlist"
                entityId={resolvedParams.id}
                entitySlug={resolvedParams.slug}
                backHref={`/staff/view/${resolvedParams.id}/${resolvedParams.slug}`}
                backText="Back to Staff"
            />

            <Suspense fallback={<LoadingSpinner className="min-h-screen" />}>
                <PlaylistViewContent params={params} />
            </Suspense>
        </>
    );
}
