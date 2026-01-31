'use client'

import {
    Alert,
    Button,
    Collapse,
    Empty,
    InputNumber,
    Modal,
    Slider,
    Space,
    Spin,
    Switch,
    Table,
    Tag,
    Typography,
} from 'antd';
import {useState} from 'react';

import type {StaffListViewEnriched, SimilarStaff} from '@/types/api/staff';
import {getStaffDisplayName} from '@/types/api/staff';

const {Text} = Typography;

export interface SearchSettings {
    jw_weight: number;
    dice_weight: number;
    min_similarity: number;
    restrict_to_parent: boolean;
    limit: number;
}

interface SimilarStaffModalProps {
    open: boolean;
    onCancel: () => void;
    staff: StaffListViewEnriched | null;
    similarStaff: SimilarStaff[];
    loading: boolean;
    onMergeSelection: (selectedIds: number[]) => void;
    onVerifyOnly: () => void;
    searchSettings: SearchSettings;
    onSearchSettingsChange: (settings: SearchSettings) => void;
}

export default function SimilarStaffModal({
    open,
    onCancel,
    staff,
    similarStaff,
    loading,
    onMergeSelection,
    onVerifyOnly,
    searchSettings,
    onSearchSettingsChange,
}: SimilarStaffModalProps) {
    const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);

    const columns = [
        {
            title: 'Name',
            key: 'name',
            render: (_: any, record: SimilarStaff) => {
                const name = getStaffDisplayName(record);
                return (
                    <Space>
                        <Text strong>{name}</Text>
                        {record.verified ? (
                            <Tag color="green">Verified</Tag>
                        ) : (
                            <Tag color="orange">Unverified</Tag>
                        )}
                        {record.approved ? (
                            <Tag color="blue">Approved</Tag>
                        ) : null}
                    </Space>
                );
            },
        },
        {
            title: 'Similarity',
            dataIndex: 'similarity_score',
            key: 'similarity_score',
            width: 120,
            render: (score: number) => {
                let color = 'red';
                if (score >= 90) color = 'green';
                else if (score >= 80) color = 'blue';
                else if (score >= 70) color = 'orange';
                return <Tag color={color}>{score}%</Tag>;
            },
        },
    ];

    const handleMergeClick = () => {
        if (selectedRowKeys.length > 0) {
            onMergeSelection(selectedRowKeys);
        }
    };

    const rowSelection = {
        selectedRowKeys,
        onChange: (keys: React.Key[]) => {
            setSelectedRowKeys(keys as number[]);
        },
    };

    const staffDisplayName = staff ? getStaffDisplayName(staff) : '';

    return (
        <Modal
            title={`Similar Staff Members to "${staffDisplayName}"`}
            open={open}
            onCancel={onCancel}
            width={700}
            footer={[
                <Button key="cancel" onClick={onCancel}>
                    Cancel
                </Button>,
                <Button
                    key="verify"
                    type="default"
                    onClick={onVerifyOnly}
                    disabled={loading}
                >
                    Verify Only (No Merge)
                </Button>,
                <Button
                    key="merge"
                    type="primary"
                    onClick={handleMergeClick}
                    disabled={selectedRowKeys.length === 0 || loading}
                >
                    Merge Selected ({selectedRowKeys.length})
                </Button>,
            ]}
        >
            {loading ? (
                <div className="flex justify-center items-center py-12">
                    <Spin size="large"/>
                </div>
            ) : (
                <>
                    <Alert
                        message="Staff Duplicate Detection"
                        description={
                            <>
                                Select staff members that are duplicates of &quot;{staffDisplayName}&quot; to merge them.
                                {searchSettings.restrict_to_parent && (
                                    <Text type="secondary" className="block mt-2">
                                        Search is restricted to staff at the same radio station.
                                    </Text>
                                )}
                            </>
                        }
                        type="info"
                        showIcon
                        className="mb-4"
                    />

                    <Collapse
                        items={[
                            {
                                key: 'settings',
                                label: 'Search Settings',
                                children: (
                                    <Space direction="vertical" className="w-full">
                                        <div className="flex items-center justify-between">
                                            <Text>Station-Scoped Search:</Text>
                                            <Switch
                                                checked={searchSettings.restrict_to_parent}
                                                onChange={(checked) =>
                                                    onSearchSettingsChange({
                                                        ...searchSettings,
                                                        restrict_to_parent: checked,
                                                    })
                                                }
                                            />
                                        </div>
                                        <div>
                                            <Text>Minimum Similarity: {searchSettings.min_similarity}%</Text>
                                            <Slider
                                                min={50}
                                                max={100}
                                                value={searchSettings.min_similarity}
                                                onChange={(value) =>
                                                    onSearchSettingsChange({
                                                        ...searchSettings,
                                                        min_similarity: value,
                                                    })
                                                }
                                            />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <Text>Max Results:</Text>
                                            <InputNumber
                                                min={5}
                                                max={100}
                                                value={searchSettings.limit}
                                                onChange={(value) =>
                                                    onSearchSettingsChange({
                                                        ...searchSettings,
                                                        limit: value || 20,
                                                    })
                                                }
                                            />
                                        </div>
                                    </Space>
                                ),
                            },
                        ]}
                        className="mb-4"
                    />

                    {similarStaff.length === 0 ? (
                        <Empty
                            description="No similar staff members found"
                            className="py-8"
                        />
                    ) : (
                        <Table
                            rowSelection={rowSelection}
                            columns={columns}
                            dataSource={similarStaff}
                            rowKey="id"
                            pagination={false}
                            size="small"
                        />
                    )}
                </>
            )}
        </Modal>
    );
}
