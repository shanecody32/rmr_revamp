import type { Metadata } from 'next';
import { Suspense } from 'react';

import LoadingSpinner from '@/components/common/feedback/LoadingSpinner';
import { PageHeader } from '@/components/layout';

import PlaylistEditContent from './components/PlaylistEditContent';

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
        title: `Edit ${name}'s Playlist - RMR Admin`,
        description: `Edit playlist for ${name}`,
    };
}

export default async function StaffPlaylistEditPage({
    params,
}: {
    params: Promise<PageParams>;
}) {
    const resolvedParams = await params;

    return (
        <>
            <PageHeader
                title="Edit Playlist"
                entityName="staff"
                actionName="playlist-edit"
                entityId={resolvedParams.id}
                entitySlug={resolvedParams.slug}
                backHref={`/staff/view/${resolvedParams.id}/${resolvedParams.slug}/playlist`}
                backText="Back to Playlist"
            />

            <Suspense fallback={<LoadingSpinner className="min-h-screen" />}>
                <PlaylistEditContent params={params} />
            </Suspense>
        </>
    );
}
