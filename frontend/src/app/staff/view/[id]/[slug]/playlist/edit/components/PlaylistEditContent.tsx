'use client';

import {
    CheckCircleOutlined,
    ClockCircleOutlined,
    PlayCircleOutlined,
    ImportOutlined,
} from '@ant-design/icons';
import { App, Button, Card, Space, Tag, Typography } from 'antd';
import Link from 'next/link';
import { use, useCallback, useEffect, useState } from 'react';

import LoadingSpinner from '@/components/common/feedback/LoadingSpinner';
import { fetchStaffById } from '@/lib/api/staff';
import {
    fetchPlaylistEntries,
    createPlaylistEntry,
    updateSpins,
    deletePlaylistEntry,
    deleteAllPlaylistEntries,
    checkDuplicateEntry,
    addSpinsToExisting,
} from '@/lib/api/staff-playlists';
import type { StaffDetailView } from '@/types/api/staff';
import { getStaffDisplayName } from '@/types/api/staff';
import type { PlaylistEntry, CreatePlaylistEntryRequest } from '@/types/api/staff-playlists';

import PlaylistEntryForm from './PlaylistEntryForm';
import PlaylistTable from './PlaylistTable';
import ImportFromArchiveModal from './ImportFromArchiveModal';
import DuplicateEntryWarningModal from './DuplicateEntryWarningModal';
import LockPlaylistControls from './LockPlaylistControls';

const { Title, Text } = Typography;

interface PlaylistEditContentProps {
    params: Promise<{ id: string; slug: string }>;
}

export default function PlaylistEditContent({ params }: PlaylistEditContentProps) {
    const resolvedParams = use(params);
    const staffId = parseInt(resolvedParams.id);

    const [staff, setStaff] = useState<StaffDetailView | null>(null);
    const [entries, setEntries] = useState<PlaylistEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [tableLoading, setTableLoading] = useState(false);
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
    const [duplicateEntry, setDuplicateEntry] = useState<PlaylistEntry | null>(null);
    const [pendingSpins, setPendingSpins] = useState<number | null>(null);
    const [pendingRequest, setPendingRequest] = useState<CreatePlaylistEntryRequest | null>(null);
    const [pagination, setPagination] = useState({ page: 1, pageSize: 500, total: 0 });
    const { message } = App.useApp();

    const isFinalised = staff?.playlist_finalised === 1;

    const loadEntries = useCallback(async (page = 1) => {
        try {
            setTableLoading(true);
            const result = await fetchPlaylistEntries({
                staff_member_id: staffId,
                page,
                page_size: pagination.pageSize,
            });
            setEntries(result.results);
            setPagination(prev => ({
                ...prev,
                page,
                total: result.pagination.total_items || 0,
            }));
        } catch (err) {
            console.error('Error loading playlist entries:', err);
            message.error('Failed to load playlist entries');
        } finally {
            setTableLoading(false);
        }
    }, [staffId, pagination.pageSize, message]);

    const loadStaff = useCallback(async () => {
        try {
            const data = await fetchStaffById(staffId);
            setStaff(data);
        } catch (err) {
            console.error('Error loading staff:', err);
            message.error('Failed to load staff member');
        }
    }, [staffId, message]);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                await Promise.all([loadStaff(), loadEntries(1)]);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [loadStaff, loadEntries]);

    const handleAddEntry = useCallback(async (request: CreatePlaylistEntryRequest) => {
        try {
            console.log('Adding entry with request:', JSON.stringify(request));

            // Check for duplicates first
            const result = await checkDuplicateEntry(
                staffId,
                request.band_id,
                request.song_id,
                request.album_id
            );

            if (result.duplicate && result.entry) {
                // Show duplicate warning modal
                setDuplicateEntry(result.entry);
                setPendingSpins(request.spins ?? null);
                setPendingRequest(request);
                setDuplicateModalOpen(true);
                return;
            }

            // No duplicate, create directly
            const newEntry = await createPlaylistEntry(request);
            setEntries(prev => [newEntry, ...prev]);
            setPagination(prev => ({ ...prev, total: prev.total + 1 }));
            message.success('Entry added');
        } catch (err: unknown) {
            const errorObj = err as { status?: number; message?: string; details?: unknown };
            console.error('Error adding entry:', {
                error: err,
                status: errorObj?.status,
                message: errorObj?.message,
                details: errorObj?.details,
                stringified: JSON.stringify(err),
            });
            const errorMessage = errorObj?.message || 'Failed to add playlist entry';
            message.error(errorMessage);
        }
    }, [staffId, message]);

    const handleDuplicateAddSpins = useCallback(async () => {
        if (!duplicateEntry || pendingSpins === null) return;
        try {
            const updated = await addSpinsToExisting(duplicateEntry.id, pendingSpins);
            setEntries(prev => prev.map(e => e.id === updated.id ? updated : e));
            message.success(`Added ${pendingSpins} spins to existing entry`);
        } catch (err) {
            console.error('Error adding spins:', err);
            message.error('Failed to add spins to existing entry');
        } finally {
            setDuplicateModalOpen(false);
            setDuplicateEntry(null);
            setPendingSpins(null);
            setPendingRequest(null);
        }
    }, [duplicateEntry, pendingSpins, message]);

    const handleDuplicateAddSeparate = useCallback(async () => {
        if (!pendingRequest) return;
        try {
            const newEntry = await createPlaylistEntry(pendingRequest);
            setEntries(prev => [newEntry, ...prev]);
            setPagination(prev => ({ ...prev, total: prev.total + 1 }));
            message.success('Entry added as separate entry');
        } catch (err) {
            console.error('Error adding entry:', err);
            message.error('Failed to add playlist entry');
        } finally {
            setDuplicateModalOpen(false);
            setDuplicateEntry(null);
            setPendingSpins(null);
            setPendingRequest(null);
        }
    }, [pendingRequest, message]);

    const handleUpdateSpins = useCallback(async (entryId: number, spins: number | null) => {
        try {
            const updated = await updateSpins(entryId, spins);
            setEntries(prev => prev.map(e => e.id === updated.id ? updated : e));
        } catch (err) {
            console.error('Error updating spins:', err);
            message.error('Failed to update spins');
        }
    }, [message]);

    const handleDeleteEntry = useCallback(async (entryId: number) => {
        try {
            await deletePlaylistEntry(entryId);
            setEntries(prev => prev.filter(e => e.id !== entryId));
            setPagination(prev => ({ ...prev, total: prev.total - 1 }));
            message.success('Entry deleted');
        } catch (err) {
            console.error('Error deleting entry:', err);
            message.error('Failed to delete entry');
        }
    }, [message]);

    const handleDeleteAll = useCallback(async () => {
        try {
            const result = await deleteAllPlaylistEntries(staffId);
            setEntries([]);
            setPagination(prev => ({ ...prev, total: 0 }));
            message.success(`Deleted ${result.deleted} entries`);
        } catch (err) {
            console.error('Error deleting all entries:', err);
            message.error('Failed to delete all entries');
        }
    }, [staffId, message]);

    const handleImportComplete = useCallback(() => {
        setImportModalOpen(false);
        loadEntries(1);
    }, [loadEntries]);

    const handlePlaylistStateChange = useCallback(() => {
        loadStaff();
    }, [loadStaff]);

    if (loading) {
        return <LoadingSpinner className="min-h-screen" />;
    }

    if (!staff) {
        return (
            <Card className="m-6">
                <div className="text-center text-red-500">Staff member not found</div>
            </Card>
        );
    }

    const displayName = getStaffDisplayName(staff);

    return (
        <div>
            {/* Header Card */}
            <Card className="mb-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <Title level={3} className="!mb-1">
                            <PlayCircleOutlined className="mr-2" />
                            Edit {displayName}&apos;s Playlist
                        </Title>
                        <Space>
                            {staff.station_name && (
                                <Text type="secondary">{staff.station_name}</Text>
                            )}
                            {isFinalised ? (
                                <Tag icon={<CheckCircleOutlined />} color="success">
                                    Finalised
                                </Tag>
                            ) : (
                                <Tag icon={<ClockCircleOutlined />} color="processing">
                                    In Progress
                                </Tag>
                            )}
                            <Text type="secondary">
                                {pagination.total} entries
                            </Text>
                        </Space>
                    </div>
                    <Space>
                        <Button
                            icon={<ImportOutlined />}
                            onClick={() => setImportModalOpen(true)}
                            disabled={isFinalised}
                        >
                            Import from Archive
                        </Button>
                        <Link href={`/staff/view/${resolvedParams.id}/${resolvedParams.slug}/playlist`}>
                            <Button>View Playlist</Button>
                        </Link>
                    </Space>
                </div>
            </Card>

            {/* Lock/Unlock Controls */}
            <LockPlaylistControls
                staffId={staffId}
                isFinalised={isFinalised}
                onStateChange={handlePlaylistStateChange}
            />

            {/* Entry Form (only when unlocked) */}
            {!isFinalised && (
                <Card className="mb-6" title="Add Entry">
                    <PlaylistEntryForm
                        staffId={staffId}
                        onAddEntry={handleAddEntry}
                    />
                </Card>
            )}

            {/* Playlist Table */}
            <Card>
                <PlaylistTable
                    entries={entries}
                    loading={tableLoading}
                    pagination={pagination}
                    isFinalised={isFinalised}
                    onUpdateSpins={handleUpdateSpins}
                    onDeleteEntry={handleDeleteEntry}
                    onDeleteAll={handleDeleteAll}
                    onPageChange={(page, pageSize) => {
                        setPagination(prev => ({ ...prev, pageSize }));
                        loadEntries(page);
                    }}
                />
            </Card>

            {/* Import Modal */}
            <ImportFromArchiveModal
                open={importModalOpen}
                staffId={staffId}
                onCancel={() => setImportModalOpen(false)}
                onComplete={handleImportComplete}
            />

            {/* Duplicate Warning Modal */}
            <DuplicateEntryWarningModal
                open={duplicateModalOpen}
                existingEntry={duplicateEntry}
                pendingSpins={pendingSpins}
                onAddSpins={handleDuplicateAddSpins}
                onAddSeparate={handleDuplicateAddSeparate}
                onCancel={() => {
                    setDuplicateModalOpen(false);
                    setDuplicateEntry(null);
                    setPendingSpins(null);
                    setPendingRequest(null);
                }}
            />
        </div>
    );
}
