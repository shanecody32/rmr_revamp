'use client'

import dynamic from 'next/dynamic';

import {PageHeader} from '@/components/layout';

const RadioStationsPageContent = dynamic(
    () => import('./components/RadioStationsPageContent'),
    {ssr: false}
);

export default function RadioStationsPage() {
    return (
        <>
            <PageHeader
                title="Radio Stations"
                entityName="radio-stations"
            />
            <RadioStationsPageContent/>
        </>
    );
}
