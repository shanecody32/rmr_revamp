'use client'

import {Checkbox, Flex, Space, Tag, Typography} from 'antd';
import {fetchSimilarStaff} from '@/lib/api/staff';
import type {SimilarStaff} from '@/types/api/staff';
import {getStaffDisplayName} from '@/types/api/staff';
import StaffMergeComparison from '../../components/StaffMergeComparison';
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

// Staff merge wrapper using the new tabbed StaffMergeComparison component
function StaffMergeWrapper(props: {
    open: boolean;
    onCancel: () => void;
    onMergeComplete: () => void;
    primaryId: number;
    selectedIds: number[];
}) {
    return (
        <StaffMergeComparison
            open={props.open}
            onCancel={props.onCancel}
            originalStaffId={props.primaryId}
            selectedStaffIds={props.selectedIds}
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
