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

import {fetchSimilarAlbums, type SimilarAlbum} from '@/lib/api/albums';
import SimilarEntitiesModal, {type SimilarEntity} from '@/components/common/modals/SimilarEntitiesModal';
import AlbumMergeComparison from '../../components/AlbumMergeComparison';

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
    const [similarAlbums, setSimilarAlbums] = useState<(SimilarAlbum & SimilarEntity)[]>([]);
    const [isSimilarModalOpen, setIsSimilarModalOpen] = useState(false);
    const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
    const [selectedAlbumsToMerge, setSelectedAlbumsToMerge] = useState<SimilarEntity[]>([]);
    const [primaryAlbumId, setPrimaryAlbumId] = useState<number | null>(null);

    const [settings, setSettings] = useState<SearchSettings>({
        min_similarity: 70,
        limit: 20,
    });

    const handleSearch = async () => {
        if (!searchTerm.trim()) {
            message.warning('Please enter an album name to search');
            return;
        }

        try {
            setSearching(true);
            const results = await fetchSimilarAlbums({
                search_term: searchTerm.trim(),
                min_similarity: settings.min_similarity,
                limit: settings.limit,
            });
            setSimilarAlbums(results);
            if (results.length === 0) {
                message.info('No similar albums found');
            } else {
                setIsSimilarModalOpen(true);
            }
        } catch (error) {
            console.error('Error searching for similar albums:', error);
            message.error('Failed to search for similar albums');
        } finally {
            setSearching(false);
        }
    };

    const handleSelectAlbum = (entity: SimilarEntity) => {
        router.push(`/albums`);
        setIsSimilarModalOpen(false);
    };

    const handleProceed = () => {
        setIsSimilarModalOpen(false);
    };

    const handleMergeSelected = (selected: SimilarEntity[]) => {
        if (selected.length < 2) {
            message.warning('Please select at least 2 albums to merge');
            return;
        }
        // Use the first selected album as the primary (merge target)
        setPrimaryAlbumId(selected[0].id);
        setSelectedAlbumsToMerge(selected);
        setIsSimilarModalOpen(false);
        setIsMergeModalOpen(true);
    };

    const handleRerunSearch = async (newSettings: {min_similarity: number; limit: number}) => {
        setSettings(newSettings);
        try {
            setSearching(true);
            const results = await fetchSimilarAlbums({
                search_term: searchTerm.trim(),
                min_similarity: newSettings.min_similarity,
                limit: newSettings.limit,
            });
            setSimilarAlbums(results);
        } catch (error) {
            console.error('Error searching for similar albums:', error);
            message.error('Failed to search for similar albums');
        } finally {
            setSearching(false);
        }
    };

    const handleMergeComplete = () => {
        message.success('Albums merged successfully');
        setIsMergeModalOpen(false);
        setSimilarAlbums([]);
        setSearchTerm('');
    };

    return (
        <div className="p-6">
            <Title level={2}>Album Duplicate Checker</Title>
            <Text type="secondary" className="mb-6 block">
                Search for albums by name to find potential duplicates and merge them
            </Text>

            {/* Search Section */}
            <Card className="mb-6">
                <Row gutter={[16, 16]} align="middle">
                    <Col xs={24} md={16}>
                        <Input
                            placeholder="Enter album name to search for duplicates..."
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
            {similarAlbums.length > 0 && !isSimilarModalOpen && (
                <Card className="mb-6">
                    <Text>
                        Found {similarAlbums.length} similar albums for &quot;{searchTerm}&quot;.{' '}
                        <Button type="link" onClick={() => setIsSimilarModalOpen(true)} className="p-0">
                            View Results
                        </Button>
                    </Text>
                </Card>
            )}

            {/* Similar Albums Modal */}
            <SimilarEntitiesModal
                open={isSimilarModalOpen}
                onCancel={() => setIsSimilarModalOpen(false)}
                onSelect={handleSelectAlbum}
                onProceed={handleProceed}
                onMergeSelected={handleMergeSelected}
                onRerunSearch={handleRerunSearch}
                similarEntities={similarAlbums}
                entityName="album"
                searchedName={searchTerm}
                loading={searching}
                mode="select-multiple"
                searchSettings={settings}
                showSearchSettings={true}
                proceedButtonLabel="Close"
            />

            {/* Merge Comparison Modal */}
            {primaryAlbumId && selectedAlbumsToMerge.length > 0 && (
                <AlbumMergeComparison
                    open={isMergeModalOpen}
                    onCancel={() => {
                        setIsMergeModalOpen(false);
                        setIsSimilarModalOpen(true);
                    }}
                    originalAlbumId={primaryAlbumId}
                    selectedAlbumIds={selectedAlbumsToMerge.filter(a => a.id !== primaryAlbumId).map(a => a.id)}
                    onMergeComplete={handleMergeComplete}
                />
            )}
        </div>
    );
}
