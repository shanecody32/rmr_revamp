'use client'

import {
    CaretRightOutlined,
    DeleteOutlined,
    PauseOutlined,
    ReloadOutlined,
    SettingOutlined,
} from '@ant-design/icons';
import {
    Alert,
    App,
    Button,
    Card,
    Col,
    Collapse,
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
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useJobs} from '@/contexts/JobContext';

import {
    clearCandidates,
    getCandidatesGrouped,
    getScanState,
    restoreCandidate,
    startScan,
    stopScan,
    updateCandidateStatus,
    type EntitySummary,
    type GroupedDuplicateResponse,
    type MatchSummary,
    type ScanStateResponse,
    type StartScanRequest,
} from '@/lib/api/duplicateScan';
import {fetchBandById, fetchSimilarBands} from '@/lib/api/bands';
import type {BandResponse} from '@/types/api/bands';
import SimilarBandsModal, {type SearchSettings} from '../../components/SimilarBandsModal';
import BandMergeComparison from '../../components/BandMergeComparison';

const {Title, Text} = Typography;

export default function DuplicateCheckerContent() {
    const {message} = App.useApp();
    const router = useRouter();
    const {isDuplicateScanRunning, getScanProgress} = useJobs();
    const isRunning = isDuplicateScanRunning('bands');
    const scanProgressFromSSE = getScanProgress('bands');
    const [scanState, setScanState] = useState<ScanStateResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [groupedResults, setGroupedResults] = useState<GroupedDuplicateResponse[]>([]);
    const [resultsLoading, setResultsLoading] = useState(false);
    const [pagination, setPagination] = useState({page: 1, pageSize: 20, total: 0});
    const [statusFilter, setStatusFilter] = useState<string>('pending');
    const prevScanRunning = useRef<boolean>(false);

    // Review modal state
    const [isSimilarBandsModalOpen, setIsSimilarBandsModalOpen] = useState(false);
    const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
    const [similarBands, setSimilarBands] = useState<any[]>([]);
    const [bandToReview, setBandToReview] = useState<BandResponse | null>(null);
    const [selectedBandsToMerge, setSelectedBandsToMerge] = useState<any[]>([]);
    const [loadingSimilarBands, setLoadingSimilarBands] = useState(false);
    const [reviewingBandId, setReviewingBandId] = useState<number | null>(null);
    const [preSelectedBandIds, setPreSelectedBandIds] = useState<number[]>([]);

    // Scan settings - defaults optimized for lower resource usage
    const [settings, setSettings] = useState<StartScanRequest>({
        min_similarity: 95,
        jw_weight: 0.6,
        dice_weight: 0.4,
        max_duplicates_to_find: 1000,
        batch_size: 50,  // Reduced from 100 to lower resource usage
        delay_between_batches_ms: 1000, // Increased from 500 to lower resource usage
        reset_progress: false,
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
            message.success('Scan completed');
            loadResults();
        }
        prevScanRunning.current = isRunning;
    }, [isRunning]);

    const loadScanState = async () => {
        try {
            setLoading(true);
            const state = await getScanState('bands');
            setScanState(state);

            // Sync settings from state
            setSettings(prev => ({
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
            message.error('Failed to load scan state');
        } finally {
            setLoading(false);
        }
    };

    const loadResults = useCallback(async (page = 1) => {
        try {
            setResultsLoading(true);
            const response = await getCandidatesGrouped('bands', {
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
            await startScan('bands', settings);
            message.success('Scan started');
        } catch (error: any) {
            message.error(error.response?.data || 'Failed to start scan');
        }
    };

    const handleStopScan = async () => {
        try {
            await stopScan('bands');
            message.success('Scan stopped');
            loadResults();
        } catch (error) {
            message.error('Failed to stop scan');
        }
    };

    const handleClearCandidates = async (pendingOnly: boolean) => {
        try {
            const result = await clearCandidates('bands', pendingOnly);
            message.success(`Deleted ${result.deleted} candidates`);
            loadResults();
            loadScanState();
        } catch (error) {
            message.error('Failed to clear candidates');
        }
    };

    const handleDismiss = async (candidateId: number) => {
        try {
            await updateCandidateStatus('bands', candidateId, 'dismissed');
            message.success('Candidate dismissed');
            loadResults();
        } catch (error) {
            message.error('Failed to dismiss candidate');
        }
    };

    const handleRestore = async (candidateId: number) => {
        try {
            await restoreCandidate('bands', candidateId);
            message.success('Candidate restored');
            loadResults();
        } catch (error) {
            message.error('Failed to restore candidate');
        }
    };

    // Memoize search settings derived from scan settings to prevent infinite loops
    const searchSettingsForModal = useMemo((): SearchSettings => ({
        jw_weight: settings.jw_weight ?? 0.6,
        dice_weight: settings.dice_weight ?? 0.4,
        min_similarity: settings.min_similarity ?? 95,
        restrict_to_parent: false,
        limit: 50, // Get more results to ensure we capture all potential duplicates
    }), [settings.jw_weight, settings.dice_weight, settings.min_similarity]);

    // Handle review button click - opens the comparison modal with potential duplicates
    const handleReviewClick = async (entitySummary: EntitySummary, matches: MatchSummary[]) => {
        try {
            setLoadingSimilarBands(true);
            setReviewingBandId(entitySummary.id);

            // Fetch full band details
            const fullBand = await fetchBandById(entitySummary.id);
            setBandToReview(fullBand);

            // Get IDs of potential duplicates from the matches
            const matchedBandIds = matches.map(m => m.matched_entity_id);
            setPreSelectedBandIds(matchedBandIds);

            // Search for similar bands using the same settings as the scan
            const similar = await fetchSimilarBands({
                search_term: entitySummary.name,
                existing_id: entitySummary.id,
                jw_weight: searchSettingsForModal.jw_weight,
                dice_weight: searchSettingsForModal.dice_weight,
                min_similarity: searchSettingsForModal.min_similarity,
                limit: searchSettingsForModal.limit,
            });

            // Filter out the band itself and sort with pre-selected at top
            const filteredSimilar = similar.filter(b => b.id !== entitySummary.id);

            // Sort so pre-selected (detected duplicates) appear first
            filteredSimilar.sort((a, b) => {
                const aIsPreselected = matchedBandIds.includes(a.id);
                const bIsPreselected = matchedBandIds.includes(b.id);
                if (aIsPreselected && !bIsPreselected) return -1;
                if (!aIsPreselected && bIsPreselected) return 1;
                return (b.similarity_score || 0) - (a.similarity_score || 0);
            });

            setSimilarBands(filteredSimilar);
            setIsSimilarBandsModalOpen(true);
        } catch (error) {
            console.error('Error fetching band details:', error);
            message.error('Failed to load band details');
        } finally {
            setLoadingSimilarBands(false);
            setReviewingBandId(null);
        }
    };

    // Handle selecting a band from similar bands modal (view only)
    const handleSelectSimilarBand = (band: any) => {
        router.push(`/bands/view/${band.id}/${band.slug}?from=duplicates`);
        setIsSimilarBandsModalOpen(false);
    };

    // Handle proceeding without merging
    const handleProceedWithoutMerge = () => {
        if (!bandToReview) return;
        router.push(`/bands/edit/${bandToReview.id}/${bandToReview.slug}?from=duplicates`);
        setIsSimilarBandsModalOpen(false);
    };

    // Handle selecting bands to merge
    const handleSelectBandsToMerge = (selectedBands: any[]) => {
        if (!bandToReview) return;
        setSelectedBandsToMerge(selectedBands);
        setIsSimilarBandsModalOpen(false);
        setIsMergeModalOpen(true);
    };

    // Handle rerunning search with new settings
    const handleRerunSearch = async (newSettings: SearchSettings) => {
        if (!bandToReview) return;

        try {
            setLoadingSimilarBands(true);

            // Update scan settings with new search settings
            setSettings(prev => ({
                ...prev,
                jw_weight: newSettings.jw_weight,
                dice_weight: newSettings.dice_weight,
                min_similarity: newSettings.min_similarity,
            }));

            const similar = await fetchSimilarBands({
                search_term: bandToReview.name,
                existing_id: bandToReview.id,
                jw_weight: newSettings.jw_weight,
                dice_weight: newSettings.dice_weight,
                min_similarity: newSettings.min_similarity,
                limit: newSettings.limit,
            });

            setSimilarBands(similar.filter(b => b.id !== bandToReview.id));
        } catch (error) {
            console.error('Error fetching similar bands:', error);
            message.error('Failed to rerun search');
        } finally {
            setLoadingSimilarBands(false);
        }
    };

    // Handle merge completion
    const handleMergeComplete = (mergedBand: BandResponse) => {
        message.success('Bands merged successfully');
        setIsMergeModalOpen(false);
        loadResults(); // Refresh the list
        router.push(`/bands/edit/${mergedBand.id}/${mergedBand.slug}?from=duplicates`);
    };

    // Table columns for grouped results
    const columns: ColumnsType<GroupedDuplicateResponse> = [
        {
            title: 'Band',
            key: 'band',
            render: (_, record) => (
                <Link href={`/bands/view/${record.entity.id}/${record.entity.slug}?from=duplicates`}>
                    <Text strong>{record.entity.name}</Text>
                </Link>
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
            width: 120,
            render: (_, record) => (
                <Button
                    type="primary"
                    size="small"
                    loading={reviewingBandId === record.entity.id}
                    onClick={() => handleReviewClick(record.entity, record.matches)}
                >
                    Review
                </Button>
            ),
        },
    ];

    // Expanded row for showing individual matches
    const expandedRowRender = (record: GroupedDuplicateResponse) => {
        const matchColumns: ColumnsType<MatchSummary> = [
            {
                title: 'Matched Band',
                key: 'matched_band',
                render: (_, match) => (
                    <Link href={`/bands/view/${match.matched_entity_id}/${match.matched_entity_slug || 'band'}?from=duplicates`}>
                        {match.matched_entity_name}
                    </Link>
                ),
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
                            <Button
                                size="small"
                                danger
                                onClick={() => handleDismiss(match.candidate_id)}
                            >
                                Dismiss
                            </Button>
                        )}
                        {match.status === 'dismissed' && (
                            <Button
                                size="small"
                                onClick={() => handleRestore(match.candidate_id)}
                            >
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

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="p-6">
            <Title level={2}>Duplicate Checker</Title>
            <Text type="secondary" className="mb-6 block">
                Scan the database for potential duplicate bands
            </Text>

            {/* Scan Status & Controls */}
            <Row gutter={[16, 16]} className="mb-6">
                <Col xs={24} lg={16}>
                    <Card title="Scan Status">
                        <Row gutter={16}>
                            <Col span={6}>
                                <Statistic
                                    title="Bands Scanned"
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

            {/* Settings Panel */}
            <Collapse
                ghost
                className="mb-6 bg-gray-50 rounded-lg"
                items={[
                    {
                        key: 'settings',
                        label: (
                            <Space>
                                <SettingOutlined />
                                <span>Scan Settings</span>
                            </Space>
                        ),
                        children: (
                            <Row gutter={[16, 16]}>
                                <Col xs={24} md={8}>
                                    <Text className="block mb-2">Minimum Similarity: {settings.min_similarity}%</Text>
                                    <Slider
                                        min={50}
                                        max={100}
                                        value={settings.min_similarity}
                                        onChange={(value) => setSettings(prev => ({...prev, min_similarity: value}))}
                                        marks={{50: '50%', 75: '75%', 95: '95%', 100: '100%'}}
                                    />
                                </Col>
                                <Col xs={24} md={8}>
                                    <Text className="block mb-2">Max Duplicates to Find</Text>
                                    <InputNumber
                                        value={settings.max_duplicates_to_find}
                                        onChange={(value) => setSettings(prev => ({...prev, max_duplicates_to_find: value || 1000}))}
                                        min={100}
                                        max={10000}
                                        step={100}
                                        style={{width: '100%'}}
                                    />
                                </Col>
                                <Col xs={24} md={8}>
                                    <Text className="block mb-2">Batch Size</Text>
                                    <InputNumber
                                        value={settings.batch_size}
                                        onChange={(value) => setSettings(prev => ({...prev, batch_size: value || 100}))}
                                        min={10}
                                        max={500}
                                        step={10}
                                        style={{width: '100%'}}
                                    />
                                </Col>
                                <Col xs={24} md={8}>
                                    <Text className="block mb-2">Reset Progress</Text>
                                    <Switch
                                        checked={settings.reset_progress}
                                        onChange={(checked) => setSettings(prev => ({...prev, reset_progress: checked}))}
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

            {/* Results Table */}
            <Card
                title="Potential Duplicates"
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
                        showTotal: (total) => `${total} bands with potential duplicates`,
                    }}
                />
            </Card>

            {/* Modal for showing similar bands and selecting for merge */}
            <SimilarBandsModal
                open={isSimilarBandsModalOpen}
                onCancel={() => setIsSimilarBandsModalOpen(false)}
                onSelect={handleSelectSimilarBand}
                onProceed={handleProceedWithoutMerge}
                onMergeSelected={handleSelectBandsToMerge}
                onRerunSearch={handleRerunSearch}
                similarBands={similarBands}
                newBandName={bandToReview?.name || ''}
                loading={loadingSimilarBands}
                mode="select-multiple"
                searchSettings={searchSettingsForModal}
                excludeBandId={bandToReview?.id}
                preSelectedIds={preSelectedBandIds}
            />

            {/* Modal for comparing and merging bands */}
            {bandToReview && (
                <BandMergeComparison
                    open={isMergeModalOpen}
                    onCancel={() => {
                        setIsMergeModalOpen(false);
                        setIsSimilarBandsModalOpen(true); // Go back to band selection
                    }}
                    originalBandId={bandToReview.id}
                    selectedBandIds={selectedBandsToMerge.map(band => band.id)}
                    onMergeComplete={handleMergeComplete}
                />
            )}
        </div>
    );
}
