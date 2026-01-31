'use client'

import {Suspense} from 'react';
import {Spin} from 'antd';
import dynamic from 'next/dynamic';

const LabelPageContent = dynamic(
    () => import('./components/LabelPageContent'),
    {ssr: false}
);

export default function LabelsPage() {
    return (
        <Suspense fallback={<div className="flex justify-center p-12"><Spin size="large" /></div>}>
            <LabelPageContent />
        </Suspense>
    );
}
