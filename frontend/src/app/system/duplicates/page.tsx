'use client'

import {Tabs, Typography} from 'antd';
import {useRouter, useSearchParams} from 'next/navigation';
import {Suspense} from 'react';
import {useJobs} from '@/contexts/JobContext';
import type {ScanEntityType} from '@/lib/api/duplicateScan';

import BandsDuplicateChecker from '@/app/bands/duplicates/components/DuplicateCheckerContent';
import AlbumsDuplicateChecker from '@/app/albums/duplicates/components/DuplicateCheckerContent';
import SongsDuplicateChecker from '@/app/songs/duplicates/components/DuplicateCheckerContent';
import LabelsDuplicateChecker from '@/app/labels/duplicates/components/DuplicateCheckerContent';
import StationsDuplicateChecker from '@/app/radio-stations/duplicates/components/DuplicateCheckerContent';
import StaffDuplicateChecker from '@/app/staff/duplicates/components/DuplicateCheckerContent';

const {Title, Text} = Typography;

interface TabConfig {
    key: string;
    label: string;
    entityType: ScanEntityType;
    component: React.ComponentType;
}

const tabs: TabConfig[] = [
    {key: 'bands', label: 'Bands', entityType: 'bands', component: BandsDuplicateChecker},
    {key: 'albums', label: 'Albums', entityType: 'albums', component: AlbumsDuplicateChecker},
    {key: 'songs', label: 'Songs', entityType: 'songs', component: SongsDuplicateChecker},
    {key: 'labels', label: 'Labels', entityType: 'labels', component: LabelsDuplicateChecker},
    {key: 'radio-stations', label: 'Radio Stations', entityType: 'radio_stations', component: StationsDuplicateChecker},
    {key: 'staff', label: 'Staff Members', entityType: 'staff_members', component: StaffDuplicateChecker},
];

function DuplicateCheckerTabs() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const {isDuplicateScanRunning} = useJobs();

    const activeTab = searchParams.get('tab') || 'bands';

    const handleTabChange = (key: string) => {
        router.replace(`/system/duplicates?tab=${key}`);
    };

    const tabItems = tabs.map((tab) => {
        const isRunning = isDuplicateScanRunning(tab.entityType);
        const Component = tab.component;
        return {
            key: tab.key,
            label: (
                <span>
                    {tab.label}
                    {isRunning && (
                        <span
                            style={{
                                display: 'inline-block',
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                backgroundColor: '#52c41a',
                                marginLeft: 8,
                            }}
                        />
                    )}
                </span>
            ),
            children: <Component />,
        };
    });

    return (
        <Tabs
            activeKey={activeTab}
            onChange={handleTabChange}
            items={tabItems}
            destroyInactiveTabPane
        />
    );
}

export default function DuplicatesPage() {
    return (
        <div className="p-6">
            <Title level={2}>Duplicate Checker</Title>
            <Text type="secondary" className="mb-6 block">
                Scan for and manage potential duplicates across all entity types
            </Text>
            <Suspense>
                <DuplicateCheckerTabs />
            </Suspense>
        </div>
    );
}
