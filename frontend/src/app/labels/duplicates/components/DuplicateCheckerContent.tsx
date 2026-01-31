'use client'

import {
    SearchOutlined,
    SettingOutlined,
} from '@ant-design/icons';
import {
    App,
    Button,
    Card,
    Col,
    Collapse,
    Input,
    Row,
    Select,
    Slider,
    Space,
    Typography,
} from 'antd';
import {useRouter} from 'next/navigation';
import {useState} from 'react';

import {fetchSimilarLabels, type SimilarLabel} from '@/lib/api/labels';
import SimilarEntitiesModal, {type SimilarEntity} from '@/components/common/modals/SimilarEntitiesModal';
import LabelMergeComparison from '../../components/LabelMergeComparison';

const {Title, Text} = Typography;

interface SearchSettings {
    min_similarity: number;
    limit: number;
}

export default function DuplicateCheckerContent() {
    const {message} = App.useApp();
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');
    const [searching, setSearching] = useState(false);
    const [similarLabels, setSimilarLabels] = useState<(SimilarLabel & SimilarEntity)[]>([]);
    const [isSimilarModalOpen, setIsSimilarModalOpen] = useState(false);
    const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
    const [selectedLabelsToMerge, setSelectedLabelsToMerge] = useState<SimilarEntity[]>([]);
    const [primaryLabelId, setPrimaryLabelId] = useState<number | null>(null);

    const [settings, setSettings] = useState<SearchSettings>({
        min_similarity: 70,
        limit: 20,
    });

    const handleSearch = async () => {
        if (!searchTerm.trim()) {
            message.warning('Please enter a label name to search');
            return;
        }

        try {
            setSearching(true);
            const results = await fetchSimilarLabels({
                search_term: searchTerm.trim(),
                min_similarity: settings.min_similarity,
                limit: settings.limit,
            });
            setSimilarLabels(results);
            if (results.length === 0) {
                message.info('No similar labels found');
            } else {
                setIsSimilarModalOpen(true);
            }
        } catch (error) {
            console.error('Error searching for similar labels:', error);
            message.error('Failed to search for similar labels');
        } finally {
            setSearching(false);
        }
    };

    const handleSelectLabel = (entity: SimilarEntity) => {
        router.push(`/labels`);
        setIsSimilarModalOpen(false);
    };

    const handleProceed = () => {
        setIsSimilarModalOpen(false);
    };

    const handleMergeSelected = (selected: SimilarEntity[]) => {
        if (selected.length < 2) {
            message.warning('Please select at least 2 labels to merge');
            return;
        }
        setPrimaryLabelId(selected[0].id);
        setSelectedLabelsToMerge(selected);
        setIsSimilarModalOpen(false);
        setIsMergeModalOpen(true);
    };

    const handleRerunSearch = async (newSettings: {min_similarity: number; limit: number}) => {
        setSettings(newSettings);
        try {
            setSearching(true);
            const results = await fetchSimilarLabels({
                search_term: searchTerm.trim(),
                min_similarity: newSettings.min_similarity,
                limit: newSettings.limit,
            });
            setSimilarLabels(results);
        } catch (error) {
            console.error('Error searching for similar labels:', error);
            message.error('Failed to search for similar labels');
        } finally {
            setSearching(false);
        }
    };

    const handleMergeComplete = () => {
        message.success('Labels merged successfully');
        setIsMergeModalOpen(false);
        setSimilarLabels([]);
        setSearchTerm('');
    };

    return (
        <div className="p-6">
            <Title level={2}>Label Duplicate Checker</Title>
            <Text type="secondary" className="mb-6 block">
                Search for labels by name to find potential duplicates and merge them
            </Text>

            {/* Search Section */}
            <Card className="mb-6">
                <Row gutter={[16, 16]} align="middle">
                    <Col xs={24} md={16}>
                        <Input
                            placeholder="Enter label name to search for duplicates..."
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
            {similarLabels.length > 0 && !isSimilarModalOpen && (
                <Card className="mb-6">
                    <Text>
                        Found {similarLabels.length} similar labels for &quot;{searchTerm}&quot;.{' '}
                        <Button type="link" onClick={() => setIsSimilarModalOpen(true)} className="p-0">
                            View Results
                        </Button>
                    </Text>
                </Card>
            )}

            {/* Similar Labels Modal */}
            <SimilarEntitiesModal
                open={isSimilarModalOpen}
                onCancel={() => setIsSimilarModalOpen(false)}
                onSelect={handleSelectLabel}
                onProceed={handleProceed}
                onMergeSelected={handleMergeSelected}
                onRerunSearch={handleRerunSearch}
                similarEntities={similarLabels}
                entityName="label"
                searchedName={searchTerm}
                loading={searching}
                mode="select-multiple"
                searchSettings={settings}
                showSearchSettings={true}
                proceedButtonLabel="Close"
            />

            {/* Merge Comparison Modal */}
            {primaryLabelId && selectedLabelsToMerge.length > 0 && (
                <LabelMergeComparison
                    open={isMergeModalOpen}
                    onCancel={() => {
                        setIsMergeModalOpen(false);
                        setIsSimilarModalOpen(true);
                    }}
                    originalLabelId={primaryLabelId}
                    selectedLabelIds={selectedLabelsToMerge.filter(l => l.id !== primaryLabelId).map(l => l.id)}
                    onMergeComplete={handleMergeComplete}
                />
            )}
        </div>
    );
}
