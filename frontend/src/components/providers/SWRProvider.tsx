'use client'

import * as React from 'react';
import { SWRConfig } from 'swr';

import { defaultSWRConfig } from '@/lib/api/swr-config';

interface SWRProviderProps {
    children: React.ReactNode;
}

export function SWRProvider({ children }: SWRProviderProps) {
    return (
        <SWRConfig value={defaultSWRConfig}>
            {children}
        </SWRConfig>
    );
}