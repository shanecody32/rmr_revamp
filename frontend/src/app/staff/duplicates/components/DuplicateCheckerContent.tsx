'use client'

import {useEffect, useState} from 'react';
import {Checkbox, Flex, Space, Tag, Typography} from 'antd';
import {fetchSimilarStaff, fetchStaffById} from '@/lib/api/staff';
import type {SimilarStaff} from '@/types/api/staff';
import {getStaffDisplayName} from '@/types/api/staff';
import StaffMergeComparisonModal from '../../components/StaffMergeComparisonModal';
import DuplicateCheckerContent from '@/components/common/duplicates/DuplicateCheckerContent';
import type {DuplicateEntityConfig, MergeConfig} from '@/components/common/duplicates/types';
import type {SimilarEntity} from '@/components/common/modals/SimilarEntitiesModal';

const {Text} = Typography;

type SimilarStaffWithName = SimilarStaff & SimilarEntity;

function toSimilarStaffWithName(staff: SimilarStaff): SimilarStaffWithName {
    return {
        ...staff,
        name: getStaffDisplayName(staff),
    };
}

const renderStaffItem = (entity: SimilarStaffWithName, isSelected: boolean) => {
    const displayName = getStaffDisplayName(entity);
    return (
        <Flex gap="middle" align="center">
            <Checkbox checked={isSelected} />
            <div>
                <div><Text strong>{displayName}</Text></div>
                <Space size="small" className="mt-1" wrap>
                    <Tag color="blue">
                        Similarity: {entity.similarity_score}%
                    </Tag>
                    {entity.on_air_name && (
                        <Tag color="purple">
                            On-Air: {entity.on_air_name}
                        </Tag>
                    )}
                    {entity.verified === 1 && (
                        <Tag color="green">Verified</Tag>
                    )}
                    {entity.approved === 1 && (
                        <Tag color="cyan">Approved</Tag>
                    )}
                </Space>
            </div>
        </Flex>
    );
};

// Staff merge modal takes staffMembers (StaffDetailView[]) instead of IDs,
// so we wrap it to pre-fetch the full details.
function StaffMergeWrapper(props: {
    open: boolean;
    onCancel: () => void;
    onMergeComplete: () => void;
    primaryId: number;
    selectedIds: number[];
}) {
    const [staffMembers, setStaffMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!props.open) return;
        const allIds = [props.primaryId, ...props.selectedIds];
        setLoading(true);
        Promise.all(
            allIds.map(id =>
                fetchStaffById(id, {
                    include_images: true,
                    include_addresses: true,
                    include_links: true,
                    include_phones: true,
                    include_sub_genres: true,
                })
            )
        )
            .then(setStaffMembers)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [props.open, props.primaryId, props.selectedIds]);

    if (loading || staffMembers.length === 0) return null;

    return (
        <StaffMergeComparisonModal
            open={props.open}
            onCancel={props.onCancel}
            staffMembers={staffMembers}
            onMergeComplete={props.onMergeComplete}
        />
    );
}

const config: DuplicateEntityConfig = {
    entityType: 'staff_members',
    displayName: 'Staff Member',
    displayNamePlural: 'Staff Members',
    viewUrl: (id, slug) => `/staff/view/${id}/${slug}`,
    editUrl: (id, slug) => `/staff/edit/${id}/${slug}`,
    getEntityName: (entity) => getStaffDisplayName(entity),
    fetchSimilar: async (params) => {
        const results = await fetchSimilarStaff(params);
        return results.map(toSimilarStaffWithName);
    },
    MergeComponent: StaffMergeWrapper,
    getMergeProps: (mc: MergeConfig) => ({
        open: mc.open,
        onCancel: mc.onCancel,
        onMergeComplete: mc.onMergeComplete,
        primaryId: mc.primaryId,
        selectedIds: mc.selectedIds,
    }),
    hasManualSearch: true,
    renderEntityItem: renderStaffItem,
    getEntityDisplayName: (entity) => getStaffDisplayName(entity),
};

export default function StaffDuplicateChecker() {
    return <DuplicateCheckerContent config={config} />;
}
