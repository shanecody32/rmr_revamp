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
    Modal,
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
import SimilarEntitiesModal, {type SimilarEntity} from '@/components/common/modals/SimilarEntitiesModal';
import type {DuplicateEntityConfig} from './types';

const {Text} = Typography;

interface ManualSearchSettings {
    min_similarity: number;
    limit: number;
}

interface Props {
    config: DuplicateEntityConfig;
}

export default function DuplicateCheckerContent({config}: Props) {
    const {message, modal} = App.useApp();
    const {isDuplicateScanRunning, getScanProgress} = useJobs();
    const sseIsRunning = isDuplicateScanRunning(config.entityType);
    const scanProgressFromSSE = getScanProgress(config.entityType);

    // Optimistic local running state for fast-completing scans
    const [localIsRunning, setLocalIsRunning] = useState(false);
    const isRunning = sseIsRunning || localIsRunning;

    // Scan state
    const [scanState, setScanState] = useState<ScanStateResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [groupedResults, setGroupedResults] = useState<GroupedDuplicateResponse[]>([]);
    const [resultsLoading, setResultsLoading] = useState(false);
    const [pagination, setPagination] = useState({page: 1, pageSize: 20, total: 0});
    const [statusFilter, setStatusFilter] = useState<string>('pending');
    const prevScanRunning = useRef<boolean>(false);

    // Phase 1e: Separate pending count state
    const [pendingCount, setPendingCount] = useState<number>(0);

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
    const [similarEntities, setSimilarEntities] = useState<(SimilarEntity & Record<string, any>)[]>([]);
    const [isSimilarModalOpen, setIsSimilarModalOpen] = useState(false);
    const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
    const [selectedToMerge, setSelectedToMerge] = useState<SimilarEntity[]>([]);
    const [primaryId, setPrimaryId] = useState<number | null>(null);
    const [manualSettings, setManualSettings] = useState<ManualSearchSettings>({
        min_similarity: 70,
        limit: 20,
    });

    // Review flow state
    const [reviewingEntityId, setReviewingEntityId] = useState<number | null>(null); // loading spinner
    const [reviewedEntityId, setReviewedEntityId] = useState<number | null>(null); // persisted for merge
    const [reviewEntityName, setReviewEntityName] = useState('');
    const [preSelectedIds, setPreSelectedIds] = useState<number[]>([]);

    // Phase 1e: Fetch pending count independently
    const loadPendingCount = useCallback(async () => {
        try {
            const response = await getCandidatesGrouped(config.entityType, {
                page: 1,
                page_size: 1,
                status: 'pending',
            });
            setPendingCount(response.pagination.total_items);
        } catch (error) {
            console.error('Failed to load pending count:', error);
        }
    }, [config.entityType]);

    // Load scan state on mount
    useEffect(() => {
        loadScanState();
        loadResults();
        loadPendingCount();
    }, []);

    // Sync scan state from SSE context
    useEffect(() => {
        if (scanProgressFromSSE) {
            setScanState(scanProgressFromSSE);
            // SSE has taken over — clear optimistic local state
            if (scanProgressFromSSE.is_running) {
                setLocalIsRunning(false);
            }
        }
    }, [scanProgressFromSSE]);

    // Phase 1d: Detect scan completion via context — only reload results, no toast
    // (JobContext already fires a toast)
    useEffect(() => {
        if (prevScanRunning.current && !isRunning) {
            loadResults();
            loadPendingCount();
        }
        prevScanRunning.current = isRunning;
    }, [isRunning]);

    const loadScanState = async () => {
        try {
            setLoading(true);
            const state = await getScanState(config.entityType);
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
            const response = await getCandidatesGrouped(config.entityType, {
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
    }, [config.entityType, pagination.pageSize, statusFilter]);

    useEffect(() => {
        loadResults(1);
    }, [statusFilter, loadResults]);

    const handleStartScan = async () => {
        try {
            setLocalIsRunning(true);
            await startScan(config.entityType, scanSettings);
            message.success(`${config.displayName} scan started`);

            // Poll for completion — handles fast-finishing scans that SSE misses
            const pollForCompletion = async () => {
                const state = await getScanState(config.entityType);
                setScanState(state);
                if (!state.is_running) {
                    setLocalIsRunning(false);
                    loadResults();
                    loadPendingCount();
                } else {
                    setTimeout(pollForCompletion, 2000);
                }
            };
            setTimeout(pollForCompletion, 1000);
        } catch (error: any) {
            setLocalIsRunning(false);
            message.error(error.response?.data || 'Failed to start scan');
        }
    };

    const handleStopScan = async () => {
        try {
            await stopScan(config.entityType);
            setLocalIsRunning(false);
            message.success(`${config.displayName} scan stopped`);
            loadResults();
        } catch (error) {
            message.error('Failed to stop scan');
        }
    };

    const handleClearCandidates = async (pendingOnly: boolean) => {
        try {
            const result = await clearCandidates(config.entityType, pendingOnly);
            message.success(`Deleted ${result.deleted} candidates`);
            loadResults();
            loadScanState();
            loadPendingCount();
        } catch (error) {
            message.error('Failed to clear candidates');
        }
    };

    const handleDismiss = async (candidateId: number) => {
        try {
            await updateCandidateStatus(config.entityType, candidateId, 'dismissed');
            message.success('Candidate dismissed');
            loadResults();
            loadPendingCount();
        } catch (error) {
            message.error('Failed to dismiss candidate');
        }
    };

    const handleRestore = async (candidateId: number) => {
        try {
            await restoreCandidate(config.entityType, candidateId);
            message.success('Candidate restored');
            loadResults();
            loadPendingCount();
        } catch (error) {
            message.error('Failed to restore candidate');
        }
    };

    // Phase 1c: Dismiss all with confirmation
    const handleDismissAll = (record: GroupedDuplicateResponse) => {
        const pendingIds = record.matches
            .filter(m => m.status === 'pending')
            .map(m => m.candidate_id);

        modal.confirm({
            title: 'Dismiss All Matches',
            content: `Are you sure you want to dismiss ${pendingIds.length} pending match${pendingIds.length !== 1 ? 'es' : ''} for "${record.entity.name}"?`,
            okText: 'Dismiss All',
            okType: 'danger',
            onOk: async () => {
                await Promise.all(pendingIds.map(id => updateCandidateStatus(config.entityType, id, 'dismissed')));
                message.success('All dismissed');
                loadResults();
                loadPendingCount();
            },
        });
    };

    // Review flow handler
    const handleReviewClick = async (record: GroupedDuplicateResponse) => {
        try {
            setReviewingEntityId(record.entity.id);

            // Collect matched entity IDs for pre-selection
            const matchedIds = record.matches.map(m => m.matched_entity_id);
            setPreSelectedIds(matchedIds);

            // Fetch similar entities using scan settings
            const results = await config.fetchSimilar({
                search_term: record.entity.name,
                existing_id: record.entity.id,
                min_similarity: scanSettings.min_similarity ?? 95,
                limit: 50,
            });

            // Sort: pre-selected (detected matches) first, then by score descending
            results.sort((a, b) => {
                const aIsPreselected = matchedIds.includes(a.id);
                const bIsPreselected = matchedIds.includes(b.id);
                if (aIsPreselected && !bIsPreselected) return -1;
                if (!aIsPreselected && bIsPreselected) return 1;
                return (b.similarity_score || 0) - (a.similarity_score || 0);
            });

            setSimilarEntities(results);
            setReviewEntityName(record.entity.name);
            setReviewedEntityId(record.entity.id);
            setIsSimilarModalOpen(true);
        } catch (error) {
            console.error('Error fetching similar entities:', error);
            message.error(`Failed to load similar ${config.displayNamePlural.toLowerCase()}`);
        } finally {
            setReviewingEntityId(null);
        }
    };

    // Manual search handlers
    const handleSearch = async () => {
        if (!searchTerm.trim()) {
            message.warning(`Please enter a ${config.displayName.toLowerCase()} name to search`);
            return;
        }
        try {
            setSearching(true);
            setPreSelectedIds([]);
            setReviewEntityName('');
            setReviewedEntityId(null);
            const results = await config.fetchSimilar({
                search_term: searchTerm.trim(),
                min_similarity: manualSettings.min_similarity,
                limit: manualSettings.limit,
            });
            setSimilarEntities(results);
            if (results.length === 0) {
                message.info(`No similar ${config.displayNamePlural.toLowerCase()} found`);
            } else {
                setIsSimilarModalOpen(true);
            }
        } catch (error) {
            console.error(`Error searching for similar ${config.displayNamePlural.toLowerCase()}:`, error);
            message.error(`Failed to search for similar ${config.displayNamePlural.toLowerCase()}`);
        } finally {
            setSearching(false);
        }
    };

    // Phase 1a: Fix entity navigation — navigate to view page, not list page
    const handleSelectEntity = (entity: SimilarEntity) => {
        const slug = (entity as any).slug || 'entity';
        window.open(config.viewUrl(entity.id, slug), '_blank');
        setIsSimilarModalOpen(false);
    };

    const handleProceed = () => {
        setIsSimilarModalOpen(false);
    };

    const handleMergeSelected = (selected: SimilarEntity[]) => {
        if (selected.length < 2) {
            message.warning(`Please select at least 2 ${config.displayNamePlural.toLowerCase()} to merge`);
            return;
        }
        if (reviewedEntityId !== null) {
            setPrimaryId(reviewedEntityId);
        } else {
            setPrimaryId(selected[0].id);
        }
        setSelectedToMerge(selected);
        setIsSimilarModalOpen(false);
        setIsMergeModalOpen(true);
    };

    const handleRerunSearch = async (newSettings: {min_similarity: number; limit: number}) => {
        setManualSettings(newSettings);
        try {
            setSearching(true);
            const results = await config.fetchSimilar({
                search_term: searchTerm.trim(),
                min_similarity: newSettings.min_similarity,
                limit: newSettings.limit,
            });
            setSimilarEntities(results);
        } catch (error) {
            console.error(`Error searching for similar ${config.displayNamePlural.toLowerCase()}:`, error);
            message.error(`Failed to search for similar ${config.displayNamePlural.toLowerCase()}`);
        } finally {
            setSearching(false);
        }
    };

    const handleMergeComplete = () => {
        message.success(`${config.displayNamePlural} merged successfully`);
        setIsMergeModalOpen(false);
        setSimilarEntities([]);
        setSearchTerm('');
        loadResults();
        loadPendingCount();
    };

    // Phase 1b: Entity name as Link in results table
    const columns: ColumnsType<GroupedDuplicateResponse> = [
        {
            title: config.displayName,
            key: 'entity',
            render: (_, record) => (
                <Link href={config.viewUrl(record.entity.id, record.entity.slug)}>
                    <Text strong>{record.entity.name}</Text>
                </Link>
            ),
        },
        {
            title: 'Potential Duplicates',
            key: 'match_count',
            dataIndex: 'match_count',
            width: 150,
            sorter: (a, b) => a.match_count - b.match_count,
            render: (count: number) => (
                <Tag color="blue">{count} match{count !== 1 ? 'es' : ''}</Tag>
            ),
        },
        {
            title: 'Highest Score',
            key: 'highest_score',
            dataIndex: 'highest_score',
            width: 120,
            sorter: (a, b) => a.highest_score - b.highest_score,
            defaultSortOrder: 'descend' as const,
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
            width: 200,
            render: (_, record) => (
                <Space>
                    <Button
                        type="primary"
                        size="small"
                        loading={reviewingEntityId === record.entity.id}
                        onClick={() => handleReviewClick(record)}
                    >
                        Review
                    </Button>
                    {record.matches.some(m => m.status === 'pending') && (
                        <Button
                            size="small"
                            danger
                            onClick={() => handleDismissAll(record)}
                        >
                            Dismiss All
                        </Button>
                    )}
                </Space>
            ),
        },
    ];

    // Phase 1b: Entity name as Link in expanded row
    const expandedRowRender = (record: GroupedDuplicateResponse) => {
        const matchColumns: ColumnsType<MatchSummary> = [
            {
                title: `Matched ${config.displayName}`,
                key: 'matched_entity',
                render: (_, match) => (
                    <Link href={config.viewUrl(match.matched_entity_id, match.matched_entity_slug)}>
                        {match.matched_entity_name}
                    </Link>
                ),
            },
            {
                title: 'Score',
                key: 'score',
                dataIndex: 'similarity_score',
                width: 80,
                sorter: (a: MatchSummary, b: MatchSummary) => a.similarity_score - b.similarity_score,
                defaultSortOrder: 'descend' as const,
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

    const MergeComponent = config.MergeComponent;

    return (
        <div className="p-6">
            {/* Scan Status & Controls */}
            <Row gutter={[16, 16]} className="mb-6">
                <Col xs={24} lg={16}>
                    <Card title="Scan Status" loading={loading}>
                        <Row gutter={16}>
                            <Col span={6}>
                                <Statistic
                                    title={`${config.displayNamePlural} Scanned`}
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
                        {/* Phase 1e: Use dedicated pending count, not pagination.total */}
                        <Statistic
                            title="Pending Review"
                            value={pendingCount}
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
                        onShowSizeChange: (_current, size) => {
                            setPagination(prev => ({...prev, pageSize: size, page: 1}));
                        },
                        showSizeChanger: true,
                        pageSizeOptions: ['10', '20', '50', '100'],
                        showTotal: (total) => `${total} ${config.displayNamePlural.toLowerCase()} with potential duplicates`,
                    }}
                />
            </Card>

            {/* Manual Search Section */}
            {config.hasManualSearch && (
                <>
                    <Card title="Manual Search" className="mb-6">
                        <Row gutter={[16, 16]} align="middle">
                            <Col xs={24} md={16}>
                                <Input
                                    placeholder={`Enter ${config.displayName.toLowerCase()} name to search for duplicates...`}
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

                    {similarEntities.length > 0 && !isSimilarModalOpen && (
                        <Card className="mb-6">
                            <Text>
                                Found {similarEntities.length} similar {config.displayNamePlural.toLowerCase()} for &quot;{searchTerm}&quot;.{' '}
                                <Button type="link" onClick={() => setIsSimilarModalOpen(true)} className="p-0">
                                    View Results
                                </Button>
                            </Text>
                        </Card>
                    )}

                    <SimilarEntitiesModal
                        open={isSimilarModalOpen}
                        onCancel={() => setIsSimilarModalOpen(false)}
                        onSelect={handleSelectEntity}
                        onProceed={handleProceed}
                        onMergeSelected={handleMergeSelected}
                        onRerunSearch={handleRerunSearch}
                        similarEntities={similarEntities}
                        entityName={config.displayName.toLowerCase()}
                        searchedName={reviewEntityName || searchTerm}
                        loading={searching}
                        mode="select-multiple"
                        searchSettings={manualSettings}
                        proceedButtonLabel="Close"
                        renderItem={config.renderEntityItem}
                        getEntityName={config.getEntityDisplayName}
                        preSelectedIds={preSelectedIds}
                    />

                    {primaryId && selectedToMerge.length > 0 && (
                        <MergeComponent
                            {...config.getMergeProps({
                                open: isMergeModalOpen,
                                onCancel: () => {
                                    setIsMergeModalOpen(false);
                                    setIsSimilarModalOpen(true);
                                },
                                onMergeComplete: handleMergeComplete,
                                primaryId,
                                selectedIds: selectedToMerge.filter(e => e.id !== primaryId).map(e => e.id),
                                selectedEntities: selectedToMerge,
                            })}
                        />
                    )}
                </>
            )}
        </div>
    );
}
