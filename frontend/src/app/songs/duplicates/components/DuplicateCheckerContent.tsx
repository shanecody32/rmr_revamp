'use client'

import {
    CaretRightOutlined,
    DeleteOutlined,
    PauseOutlined,
    ReloadOutlined,
    SearchOutlined,
    SettingOutlined,
} from '@ant-design/icons';
import {
    Alert,
    App,
    Button,
    Card,
    Col,
    Collapse,
    Input,
    InputNumber,
    Progress,
    Row,
    Select,
    Slider,
    Space,
    Statistic,
    Switch,
    Table,
    Tag,
    Typography,
} from 'antd';
import type {ColumnsType} from 'antd/es/table';
import {useRouter} from 'next/navigation';
import {useCallback, useEffect, useRef, useState} from 'react';
import {useJobs} from '@/contexts/JobContext';

import {
    clearCandidates,
    getCandidatesGrouped,
    getScanState,
    restoreCandidate,
    startScan,
    stopScan,
    updateCandidateStatus,
    type GroupedDuplicateResponse,
    type MatchSummary,
    type ScanStateResponse,
    type StartScanRequest,
} from '@/lib/api/duplicateScan';
import {fetchSimilarSongs, type SimilarSong} from '@/lib/api/songs';
import SimilarEntitiesModal, {type SimilarEntity} from '@/components/common/modals/SimilarEntitiesModal';
import SongMergeComparison from '../../components/SongMergeComparison';

const {Title, Text} = Typography;

interface ManualSearchSettings {
    min_similarity: number;
    limit: number;
}

export default function DuplicateCheckerContent() {
    const {message} = App.useApp();
    const router = useRouter();
    const {isDuplicateScanRunning, getScanProgress} = useJobs();
    const isRunning = isDuplicateScanRunning('songs');
    const scanProgressFromSSE = getScanProgress('songs');

    // Scan state
    const [scanState, setScanState] = useState<ScanStateResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [groupedResults, setGroupedResults] = useState<GroupedDuplicateResponse[]>([]);
    const [resultsLoading, setResultsLoading] = useState(false);
    const [pagination, setPagination] = useState({page: 1, pageSize: 20, total: 0});
    const [statusFilter, setStatusFilter] = useState<string>('pending');
    const prevScanRunning = useRef<boolean>(false);

    // Scan settings
    const [scanSettings, setScanSettings] = useState<StartScanRequest>({
        min_similarity: 95,
        jw_weight: 0.6,
        dice_weight: 0.4,
        max_duplicates_to_find: 1000,
        batch_size: 50,
        delay_between_batches_ms: 1000,
        reset_progress: false,
    });

    // Manual search state
    const [searchTerm, setSearchTerm] = useState('');
    const [searching, setSearching] = useState(false);
    const [similarSongs, setSimilarSongs] = useState<(SimilarSong & SimilarEntity)[]>([]);
    const [isSimilarModalOpen, setIsSimilarModalOpen] = useState(false);
    const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
    const [selectedSongsToMerge, setSelectedSongsToMerge] = useState<SimilarEntity[]>([]);
    const [primarySongId, setPrimarySongId] = useState<number | null>(null);
    const [manualSettings, setManualSettings] = useState<ManualSearchSettings>({
        min_similarity: 70,
        limit: 20,
    });

    // Load scan state on mount
    useEffect(() => {
        loadScanState();
        loadResults();
    }, []);

    // Sync scan state from SSE context
    useEffect(() => {
        if (scanProgressFromSSE) {
            setScanState(scanProgressFromSSE);
        }
    }, [scanProgressFromSSE]);

    // Detect scan completion via context
    useEffect(() => {
        if (prevScanRunning.current && !isRunning) {
            message.success('Song scan completed');
            loadResults();
        }
        prevScanRunning.current = isRunning;
    }, [isRunning]);

    const loadScanState = async () => {
        try {
            setLoading(true);
            const state = await getScanState('songs');
            setScanState(state);
            setScanSettings(prev => ({
                ...prev,
                min_similarity: state.min_similarity,
                jw_weight: state.jw_weight,
                dice_weight: state.dice_weight,
                max_duplicates_to_find: state.max_duplicates_to_find,
                batch_size: state.batch_size,
                delay_between_batches_ms: state.delay_between_batches_ms,
            }));
        } catch (error) {
            console.error('Failed to load scan state:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadResults = useCallback(async (page = 1) => {
        try {
            setResultsLoading(true);
            const response = await getCandidatesGrouped('songs', {
                page,
                page_size: pagination.pageSize,
                status: statusFilter || undefined,
            });
            setGroupedResults(response.results);
            setPagination(prev => ({
                ...prev,
                page: response.pagination.page,
                total: response.pagination.total_items,
            }));
        } catch (error) {
            console.error('Failed to load results:', error);
        } finally {
            setResultsLoading(false);
        }
    }, [pagination.pageSize, statusFilter]);

    useEffect(() => {
        loadResults(1);
    }, [statusFilter, loadResults]);

    const handleStartScan = async () => {
        try {
            await startScan('songs', scanSettings);
            message.success('Song scan started');
        } catch (error: any) {
            message.error(error.response?.data || 'Failed to start scan');
        }
    };

    const handleStopScan = async () => {
        try {
            await stopScan('songs');
            message.success('Song scan stopped');
            loadResults();
        } catch (error) {
            message.error('Failed to stop scan');
        }
    };

    const handleClearCandidates = async (pendingOnly: boolean) => {
        try {
            const result = await clearCandidates('songs', pendingOnly);
            message.success(`Deleted ${result.deleted} candidates`);
            loadResults();
            loadScanState();
        } catch (error) {
            message.error('Failed to clear candidates');
        }
    };

    const handleDismiss = async (candidateId: number) => {
        try {
            await updateCandidateStatus('songs', candidateId, 'dismissed');
            message.success('Candidate dismissed');
            loadResults();
        } catch (error) {
            message.error('Failed to dismiss candidate');
        }
    };

    const handleRestore = async (candidateId: number) => {
        try {
            await restoreCandidate('songs', candidateId);
            message.success('Candidate restored');
            loadResults();
        } catch (error) {
            message.error('Failed to restore candidate');
        }
    };

    // Manual search handlers
    const handleSearch = async () => {
        if (!searchTerm.trim()) {
            message.warning('Please enter a song name to search');
            return;
        }
        try {
            setSearching(true);
            const results = await fetchSimilarSongs({
                search_term: searchTerm.trim(),
                min_similarity: manualSettings.min_similarity,
                limit: manualSettings.limit,
            });
            setSimilarSongs(results);
            if (results.length === 0) {
                message.info('No similar songs found');
            } else {
                setIsSimilarModalOpen(true);
            }
        } catch (error) {
            console.error('Error searching for similar songs:', error);
            message.error('Failed to search for similar songs');
        } finally {
            setSearching(false);
        }
    };

    const handleSelectSong = (entity: SimilarEntity) => {
        router.push(`/songs`);
        setIsSimilarModalOpen(false);
    };

    const handleProceed = () => {
        setIsSimilarModalOpen(false);
    };

    const handleMergeSelected = (selected: SimilarEntity[]) => {
        if (selected.length < 2) {
            message.warning('Please select at least 2 songs to merge');
            return;
        }
        setPrimarySongId(selected[0].id);
        setSelectedSongsToMerge(selected);
        setIsSimilarModalOpen(false);
        setIsMergeModalOpen(true);
    };

    const handleRerunSearch = async (newSettings: {min_similarity: number; limit: number}) => {
        setManualSettings(newSettings);
        try {
            setSearching(true);
            const results = await fetchSimilarSongs({
                search_term: searchTerm.trim(),
                min_similarity: newSettings.min_similarity,
                limit: newSettings.limit,
            });
            setSimilarSongs(results);
        } catch (error) {
            console.error('Error searching for similar songs:', error);
            message.error('Failed to search for similar songs');
        } finally {
            setSearching(false);
        }
    };

    const handleMergeComplete = () => {
        message.success('Songs merged successfully');
        setIsMergeModalOpen(false);
        setSimilarSongs([]);
        setSearchTerm('');
        loadResults();
    };

    // Table columns for scan results
    const columns: ColumnsType<GroupedDuplicateResponse> = [
        {
            title: 'Song',
            key: 'song',
            render: (_, record) => (
                <Text strong>{record.entity.name}</Text>
            ),
        },
        {
            title: 'Potential Duplicates',
            key: 'match_count',
            dataIndex: 'match_count',
            width: 150,
            render: (count: number) => (
                <Tag color="blue">{count} match{count !== 1 ? 'es' : ''}</Tag>
            ),
        },
        {
            title: 'Highest Score',
            key: 'highest_score',
            dataIndex: 'highest_score',
            width: 120,
            render: (score: number) => (
                <Tag color={score >= 95 ? 'red' : score >= 85 ? 'orange' : 'green'}>
                    {score}%
                </Tag>
            ),
        },
        {
            title: 'Status',
            key: 'status',
            width: 180,
            render: (_, record) => (
                <Space>
                    {record.pending_count > 0 && (
                        <Tag color="gold">{record.pending_count} pending</Tag>
                    )}
                    {record.dismissed_count > 0 && (
                        <Tag color="default">{record.dismissed_count} dismissed</Tag>
                    )}
                </Space>
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 150,
            render: (_, record) => (
                <Space>
                    {record.matches.some(m => m.status === 'pending') && (
                        <Button
                            size="small"
                            danger
                            onClick={() => {
                                const pendingIds = record.matches
                                    .filter(m => m.status === 'pending')
                                    .map(m => m.candidate_id);
                                Promise.all(pendingIds.map(id => updateCandidateStatus('songs', id, 'dismissed')))
                                    .then(() => {
                                        message.success('All dismissed');
                                        loadResults();
                                    });
                            }}
                        >
                            Dismiss All
                        </Button>
                    )}
                </Space>
            ),
        },
    ];

    const expandedRowRender = (record: GroupedDuplicateResponse) => {
        const matchColumns: ColumnsType<MatchSummary> = [
            {
                title: 'Matched Song',
                key: 'matched_song',
                render: (_, match) => match.matched_entity_name,
            },
            {
                title: 'Score',
                key: 'score',
                dataIndex: 'similarity_score',
                width: 80,
                render: (score: number) => `${score}%`,
            },
            {
                title: 'Status',
                key: 'status',
                dataIndex: 'status',
                width: 100,
                render: (status: string) => (
                    <Tag color={status === 'pending' ? 'gold' : status === 'dismissed' ? 'default' : 'green'}>
                        {status}
                    </Tag>
                ),
            },
            {
                title: 'Actions',
                key: 'actions',
                width: 150,
                render: (_, match) => (
                    <Space>
                        {match.status === 'pending' && (
                            <Button size="small" danger onClick={() => handleDismiss(match.candidate_id)}>
                                Dismiss
                            </Button>
                        )}
                        {match.status === 'dismissed' && (
                            <Button size="small" onClick={() => handleRestore(match.candidate_id)}>
                                Restore
                            </Button>
                        )}
                    </Space>
                ),
            },
        ];

        return (
            <Table
                columns={matchColumns}
                dataSource={record.matches}
                rowKey="candidate_id"
                pagination={false}
                size="small"
            />
        );
    };

    return (
        <div className="p-6">
            <Title level={2}>Song Duplicate Checker</Title>
            <Text type="secondary" className="mb-6 block">
                Scan the database for potential duplicate songs, or search manually
            </Text>

            {/* Scan Status & Controls */}
            <Row gutter={[16, 16]} className="mb-6">
                <Col xs={24} lg={16}>
                    <Card title="Scan Status" loading={loading}>
                        <Row gutter={16}>
                            <Col span={6}>
                                <Statistic
                                    title="Songs Scanned"
                                    value={scanState?.total_items_scanned || 0}
                                    suffix={`/ ${scanState?.total_items || 0}`}
                                />
                            </Col>
                            <Col span={6}>
                                <Statistic
                                    title="Duplicates Found"
                                    value={scanState?.duplicates_found || 0}
                                />
                            </Col>
                            <Col span={6}>
                                <Statistic
                                    title="Min Similarity"
                                    value={scanState?.min_similarity || 95}
                                    suffix="%"
                                />
                            </Col>
                            <Col span={6}>
                                <Statistic
                                    title="Status"
                                    value={scanState?.is_running ? 'Running' : 'Stopped'}
                                    styles={{content: {color: scanState?.is_running ? '#52c41a' : '#8c8c8c'}}}
                                />
                            </Col>
                        </Row>

                        {scanState?.is_running && (
                            <Progress
                                percent={Math.round(scanState.progress_percent)}
                                status="active"
                                className="mt-4"
                            />
                        )}

                        {scanState?.last_error && (
                            <Alert
                                type="error"
                                message="Last Error"
                                description={scanState.last_error}
                                className="mt-4"
                                closable
                            />
                        )}

                        <Space className="mt-4">
                            {!isRunning ? (
                                <Button
                                    type="primary"
                                    icon={<CaretRightOutlined />}
                                    onClick={handleStartScan}
                                >
                                    Start Scan
                                </Button>
                            ) : (
                                <Button
                                    danger
                                    icon={<PauseOutlined />}
                                    onClick={handleStopScan}
                                >
                                    Stop Scan
                                </Button>
                            )}
                            <Button
                                icon={<ReloadOutlined />}
                                onClick={loadScanState}
                                disabled={isRunning}
                            >
                                Refresh
                            </Button>
                            <Button
                                icon={<DeleteOutlined />}
                                onClick={() => handleClearCandidates(true)}
                                disabled={isRunning}
                            >
                                Clear Pending
                            </Button>
                        </Space>
                    </Card>
                </Col>

                <Col xs={24} lg={8}>
                    <Card title="Quick Stats">
                        <Statistic
                            title="Pending Review"
                            value={pagination.total}
                            className="mb-4"
                        />
                        {scanState?.stop_reason && (
                            <Text type="secondary">
                                Last stop: {scanState.stop_reason}
                            </Text>
                        )}
                    </Card>
                </Col>
            </Row>

            {/* Scan Settings */}
            <Collapse
                ghost
                className="mb-6 bg-gray-50 rounded-lg"
                items={[
                    {
                        key: 'scan-settings',
                        label: (
                            <Space>
                                <SettingOutlined />
                                <span>Scan Settings</span>
                            </Space>
                        ),
                        children: (
                            <Row gutter={[16, 16]}>
                                <Col xs={24} md={8}>
                                    <Text className="block mb-2">Minimum Similarity: {scanSettings.min_similarity}%</Text>
                                    <Slider
                                        min={50}
                                        max={100}
                                        value={scanSettings.min_similarity}
                                        onChange={(value) => setScanSettings(prev => ({...prev, min_similarity: value}))}
                                        marks={{50: '50%', 75: '75%', 95: '95%', 100: '100%'}}
                                    />
                                </Col>
                                <Col xs={24} md={8}>
                                    <Text className="block mb-2">Max Duplicates to Find</Text>
                                    <InputNumber
                                        value={scanSettings.max_duplicates_to_find}
                                        onChange={(value) => setScanSettings(prev => ({...prev, max_duplicates_to_find: value || 1000}))}
                                        min={100}
                                        max={10000}
                                        step={100}
                                        style={{width: '100%'}}
                                    />
                                </Col>
                                <Col xs={24} md={8}>
                                    <Text className="block mb-2">Batch Size</Text>
                                    <InputNumber
                                        value={scanSettings.batch_size}
                                        onChange={(value) => setScanSettings(prev => ({...prev, batch_size: value || 100}))}
                                        min={10}
                                        max={500}
                                        step={10}
                                        style={{width: '100%'}}
                                    />
                                </Col>
                                <Col xs={24} md={8}>
                                    <Text className="block mb-2">Reset Progress</Text>
                                    <Switch
                                        checked={scanSettings.reset_progress}
                                        onChange={(checked) => setScanSettings(prev => ({...prev, reset_progress: checked}))}
                                    />
                                    <Text type="secondary" className="text-xs block mt-1">
                                        Start from beginning instead of resuming
                                    </Text>
                                </Col>
                            </Row>
                        ),
                    },
                ]}
            />

            {/* Scan Results Table */}
            <Card
                title="Scan Results - Potential Duplicates"
                className="mb-6"
                extra={
                    <Space>
                        <Text>Filter:</Text>
                        <Select
                            value={statusFilter}
                            onChange={setStatusFilter}
                            style={{width: 120}}
                            options={[
                                {value: '', label: 'All'},
                                {value: 'pending', label: 'Pending'},
                                {value: 'dismissed', label: 'Dismissed'},
                                {value: 'reviewed', label: 'Reviewed'},
                            ]}
                        />
                    </Space>
                }
            >
                <Table
                    columns={columns}
                    dataSource={groupedResults}
                    rowKey={(record) => record.entity.id}
                    loading={resultsLoading}
                    expandable={{
                        expandedRowRender,
                        rowExpandable: (record) => record.matches.length > 0,
                    }}
                    pagination={{
                        current: pagination.page,
                        pageSize: pagination.pageSize,
                        total: pagination.total,
                        onChange: (page) => loadResults(page),
                        showSizeChanger: false,
                        showTotal: (total) => `${total} songs with potential duplicates`,
                    }}
                />
            </Card>

            {/* Manual Search Section */}
            <Card title="Manual Search" className="mb-6">
                <Row gutter={[16, 16]} align="middle">
                    <Col xs={24} md={16}>
                        <Input
                            placeholder="Enter song name to search for duplicates..."
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

                <Collapse
                    ghost
                    className="mt-4"
                    items={[
                        {
                            key: 'search-settings',
                            label: (
                                <Space>
                                    <SettingOutlined />
                                    <span>Search Settings</span>
                                </Space>
                            ),
                            children: (
                                <Row gutter={[16, 16]}>
                                    <Col xs={24} md={12}>
                                        <Text className="block mb-2">Minimum Similarity: {manualSettings.min_similarity}%</Text>
                                        <Slider
                                            min={20}
                                            max={100}
                                            step={5}
                                            value={manualSettings.min_similarity}
                                            onChange={(value) => setManualSettings(prev => ({...prev, min_similarity: value}))}
                                            marks={{20: '20%', 40: '40%', 60: '60%', 80: '80%', 100: '100%'}}
                                        />
                                    </Col>
                                    <Col xs={24} md={12}>
                                        <Text className="block mb-2">Max Results</Text>
                                        <Select
                                            value={manualSettings.limit}
                                            onChange={(value) => setManualSettings(prev => ({...prev, limit: value}))}
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
            {similarSongs.length > 0 && !isSimilarModalOpen && (
                <Card className="mb-6">
                    <Text>
                        Found {similarSongs.length} similar songs for &quot;{searchTerm}&quot;.{' '}
                        <Button type="link" onClick={() => setIsSimilarModalOpen(true)} className="p-0">
                            View Results
                        </Button>
                    </Text>
                </Card>
            )}

            {/* Similar Songs Modal */}
            <SimilarEntitiesModal
                open={isSimilarModalOpen}
                onCancel={() => setIsSimilarModalOpen(false)}
                onSelect={handleSelectSong}
                onProceed={handleProceed}
                onMergeSelected={handleMergeSelected}
                onRerunSearch={handleRerunSearch}
                similarEntities={similarSongs}
                entityName="song"
                searchedName={searchTerm}
                loading={searching}
                mode="select-multiple"
                searchSettings={manualSettings}
                showSearchSettings={true}
                proceedButtonLabel="Close"
            />

            {/* Merge Comparison Modal */}
            {primarySongId && selectedSongsToMerge.length > 0 && (
                <SongMergeComparison
                    open={isMergeModalOpen}
                    onCancel={() => {
                        setIsMergeModalOpen(false);
                        setIsSimilarModalOpen(true);
                    }}
                    originalSongId={primarySongId}
                    selectedSongIds={selectedSongsToMerge.filter(s => s.id !== primarySongId).map(s => s.id)}
                    onMergeComplete={handleMergeComplete}
                />
            )}
        </div>
    );
}
