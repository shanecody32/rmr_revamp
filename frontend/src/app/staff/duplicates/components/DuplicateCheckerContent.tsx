'use client'

import {
    SearchOutlined,
    SettingOutlined,
} from '@ant-design/icons';
import {
    App,
    Button,
    Card,
    Checkbox,
    Col,
    Collapse,
    Flex,
    Input,
    Row,
    Select,
    Slider,
    Space,
    Tag,
    Typography,
} from 'antd';
import {useState} from 'react';

import {fetchSimilarStaff, fetchStaffById} from '@/lib/api/staff';
import type {SimilarStaff, StaffDetailView} from '@/types/api/staff';
import {getStaffDisplayName} from '@/types/api/staff';
import SimilarEntitiesModal, {type SimilarEntity} from '@/components/common/modals/SimilarEntitiesModal';
import StaffMergeComparisonModal from '../../components/StaffMergeComparisonModal';

const {Title, Text} = Typography;

interface SearchSettings {
    min_similarity: number;
    limit: number;
}

// Adapt SimilarStaff to include the `name` field required by SimilarEntity
type SimilarStaffWithName = SimilarStaff & SimilarEntity;

function toSimilarStaffWithName(staff: SimilarStaff): SimilarStaffWithName {
    return {
        ...staff,
        name: getStaffDisplayName(staff),
    };
}

export default function DuplicateCheckerContent() {
    const {message} = App.useApp();
    const [searchTerm, setSearchTerm] = useState('');
    const [searching, setSearching] = useState(false);
    const [similarStaff, setSimilarStaff] = useState<SimilarStaffWithName[]>([]);
    const [isSimilarModalOpen, setIsSimilarModalOpen] = useState(false);
    const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
    const [staffToMerge, setStaffToMerge] = useState<StaffDetailView[]>([]);
    const [loadingMergeData, setLoadingMergeData] = useState(false);

    const [settings, setSettings] = useState<SearchSettings>({
        min_similarity: 70,
        limit: 20,
    });

    const handleSearch = async () => {
        if (!searchTerm.trim()) {
            message.warning('Please enter a staff member name to search');
            return;
        }

        try {
            setSearching(true);
            const results = await fetchSimilarStaff({
                search_term: searchTerm.trim(),
                min_similarity: settings.min_similarity,
                limit: settings.limit,
            });
            const mapped = results.map(toSimilarStaffWithName);
            setSimilarStaff(mapped);
            if (mapped.length === 0) {
                message.info('No similar staff members found');
            } else {
                setIsSimilarModalOpen(true);
            }
        } catch (error) {
            console.error('Error searching for similar staff:', error);
            message.error('Failed to search for similar staff members');
        } finally {
            setSearching(false);
        }
    };

    const handleSelectStaff = () => {
        setIsSimilarModalOpen(false);
    };

    const handleProceed = () => {
        setIsSimilarModalOpen(false);
    };

    const handleMergeSelected = async (selected: SimilarEntity[]) => {
        if (selected.length < 2) {
            message.warning('Please select at least 2 staff members to merge');
            return;
        }

        try {
            setLoadingMergeData(true);
            // Fetch full detail views for all selected staff members
            const detailPromises = selected.map(s =>
                fetchStaffById(s.id, {
                    include_images: true,
                    include_addresses: true,
                    include_links: true,
                    include_phones: true,
                    include_sub_genres: true,
                })
            );
            const details = await Promise.all(detailPromises);
            setStaffToMerge(details);
            setIsSimilarModalOpen(false);
            setIsMergeModalOpen(true);
        } catch (error) {
            console.error('Error fetching staff details for merge:', error);
            message.error('Failed to load staff member details');
        } finally {
            setLoadingMergeData(false);
        }
    };

    const handleRerunSearch = async (newSettings: {min_similarity: number; limit: number}) => {
        setSettings(newSettings);
        try {
            setSearching(true);
            const results = await fetchSimilarStaff({
                search_term: searchTerm.trim(),
                min_similarity: newSettings.min_similarity,
                limit: newSettings.limit,
            });
            setSimilarStaff(results.map(toSimilarStaffWithName));
        } catch (error) {
            console.error('Error searching for similar staff:', error);
            message.error('Failed to search for similar staff members');
        } finally {
            setSearching(false);
        }
    };

    const handleMergeComplete = () => {
        message.success('Staff members merged successfully');
        setIsMergeModalOpen(false);
        setSimilarStaff([]);
        setStaffToMerge([]);
        setSearchTerm('');
    };

    // Custom render for staff items showing extra fields
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

    return (
        <div className="p-6">
            <Title level={2}>Staff Duplicate Checker</Title>
            <Text type="secondary" className="mb-6 block">
                Search for staff members by name to find potential duplicates and merge them
            </Text>

            {/* Search Section */}
            <Card className="mb-6">
                <Row gutter={[16, 16]} align="middle">
                    <Col xs={24} md={16}>
                        <Input
                            placeholder="Enter staff member name to search for duplicates..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onPressEnter={handleSearch}
                            prefix={<SearchOutlined />}
                            size="large"
                        />
                    </Col>
                    <Col xs={24} md={8}>
                        <Button
                            type="primary"
                            icon={<SearchOutlined />}
                            onClick={handleSearch}
                            loading={searching}
                            size="large"
                            block
                        >
                            Find Duplicates
                        </Button>
                    </Col>
                </Row>

                {/* Settings */}
                <Collapse
                    ghost
                    className="mt-4"
                    items={[
                        {
                            key: 'settings',
                            label: (
                                <Space>
                                    <SettingOutlined />
                                    <span>Search Settings</span>
                                </Space>
                            ),
                            children: (
                                <Row gutter={[16, 16]}>
                                    <Col xs={24} md={12}>
                                        <Text className="block mb-2">Minimum Similarity: {settings.min_similarity}%</Text>
                                        <Slider
                                            min={20}
                                            max={100}
                                            step={5}
                                            value={settings.min_similarity}
                                            onChange={(value) => setSettings(prev => ({...prev, min_similarity: value}))}
                                            marks={{20: '20%', 40: '40%', 60: '60%', 80: '80%', 100: '100%'}}
                                        />
                                    </Col>
                                    <Col xs={24} md={12}>
                                        <Text className="block mb-2">Max Results</Text>
                                        <Select
                                            value={settings.limit}
                                            onChange={(value) => setSettings(prev => ({...prev, limit: value}))}
                                            style={{width: 120}}
                                            options={[
                                                {value: 10, label: '10'},
                                                {value: 20, label: '20'},
                                                {value: 30, label: '30'},
                                                {value: 50, label: '50'},
                                            ]}
                                        />
                                    </Col>
                                </Row>
                            ),
                        },
                    ]}
                />
            </Card>

            {/* Results info */}
            {similarStaff.length > 0 && !isSimilarModalOpen && (
                <Card className="mb-6">
                    <Text>
                        Found {similarStaff.length} similar staff members for &quot;{searchTerm}&quot;.{' '}
                        <Button type="link" onClick={() => setIsSimilarModalOpen(true)} className="p-0">
                            View Results
                        </Button>
                    </Text>
                </Card>
            )}

            {/* Similar Staff Modal */}
            <SimilarEntitiesModal
                open={isSimilarModalOpen}
                onCancel={() => setIsSimilarModalOpen(false)}
                onSelect={handleSelectStaff}
                onProceed={handleProceed}
                onMergeSelected={handleMergeSelected}
                onRerunSearch={handleRerunSearch}
                similarEntities={similarStaff}
                entityName="staff member"
                searchedName={searchTerm}
                loading={searching || loadingMergeData}
                mode="select-multiple"
                searchSettings={settings}
                showSearchSettings={true}
                proceedButtonLabel="Close"
                renderItem={renderStaffItem}
                getEntityName={(entity) => getStaffDisplayName(entity)}
            />

            {/* Merge Comparison Modal */}
            {staffToMerge.length > 0 && (
                <StaffMergeComparisonModal
                    open={isMergeModalOpen}
                    onCancel={() => {
                        setIsMergeModalOpen(false);
                        setIsSimilarModalOpen(true);
                    }}
                    staffMembers={staffToMerge}
                    onMergeComplete={handleMergeComplete}
                />
            )}
        </div>
    );
}
