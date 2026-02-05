'use client';

import {
    EditOutlined,
    PlayCircleOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
} from '@ant-design/icons';
import { App, Button, Card, Select, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import Link from 'next/link';
import { use, useCallback, useEffect, useState } from 'react';

import LoadingSpinner from '@/components/common/feedback/LoadingSpinner';
import { fetchStaffById } from '@/lib/api/staff';
import {
    fetchPlaylistEntries,
    fetchArchiveWeeks,
    fetchArchiveEntries,
} from '@/lib/api/staff-playlists';
import type { StaffDetailView } from '@/types/api/staff';
import { getStaffDisplayName } from '@/types/api/staff';
import type { PlaylistEntry, ArchiveEntry, ArchiveWeek } from '@/types/api/staff-playlists';

const { Title, Text } = Typography;

interface PlaylistViewContentProps {
    params: Promise<{ id: string; slug: string }>;
}

export default function PlaylistViewContent({ params }: PlaylistViewContentProps) {
    const resolvedParams = use(params);
    const staffId = parseInt(resolvedParams.id);

    const [staff, setStaff] = useState<StaffDetailView | null>(null);
    const [entries, setEntries] = useState<(PlaylistEntry | ArchiveEntry)[]>([]);
    const [loading, setLoading] = useState(true);
    const [tableLoading, setTableLoading] = useState(false);
    const [archiveWeeks, setArchiveWeeks] = useState<ArchiveWeek[]>([]);
    const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
    const [pagination, setPagination] = useState({ page: 1, pageSize: 500, total: 0 });
    const { message } = App.useApp();

    const loadEntries = useCallback(async (page = 1, week: string | null = null) => {
        try {
            setTableLoading(true);
            if (week) {
                const result = await fetchArchiveEntries({
                    staff_member_id: staffId,
                    week_ending: week,
                    page,
                    page_size: pagination.pageSize,
                });
                setEntries(result.results);
                setPagination(prev => ({
                    ...prev,
                    page,
                    total: result.pagination.total_items || 0,
                }));
            } else {
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
            }
        } catch (err) {
            console.error('Error loading playlist entries:', err);
            message.error('Failed to load playlist entries');
        } finally {
            setTableLoading(false);
        }
    }, [staffId, pagination.pageSize, message]);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const [staffData, weeks] = await Promise.all([
                    fetchStaffById(staffId),
                    fetchArchiveWeeks(staffId),
                ]);
                setStaff(staffData);
                setArchiveWeeks(weeks);
                await loadEntries(1, null);
            } catch (err) {
                console.error('Error loading playlist data:', err);
                message.error('Failed to load playlist data');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [staffId, message, loadEntries]);

    const handleWeekChange = (value: string | null) => {
        setSelectedWeek(value);
        loadEntries(1, value);
    };

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
    const isFinalised = staff.playlist_finalised === 1;

    const columns: ColumnsType<PlaylistEntry | ArchiveEntry> = [
        {
            title: 'Band',
            dataIndex: 'band_name',
            key: 'band_name',
            sorter: (a, b) => (a.band_name || '').localeCompare(b.band_name || ''),
        },
        {
            title: 'Song',
            dataIndex: 'song_name',
            key: 'song_name',
            sorter: (a, b) => (a.song_name || '').localeCompare(b.song_name || ''),
        },
        {
            title: 'Album',
            dataIndex: 'album_name',
            key: 'album_name',
            render: (value: string | null) => value || '-',
        },
        {
            title: 'Label',
            dataIndex: 'label_name',
            key: 'label_name',
            render: (value: string | null) => value || '-',
        },
        {
            title: 'Sub-Genre',
            dataIndex: 'sub_genre_name',
            key: 'sub_genre_name',
            render: (value: string | null) => value || '-',
        },
        {
            title: 'Spins',
            dataIndex: 'spins',
            key: 'spins',
            width: 100,
            sorter: (a, b) => (a.spins || 0) - (b.spins || 0),
            render: (value: number | null) => value ?? '-',
        },
    ];

    return (
        <div>
            {/* Header Card */}
            <Card className="mb-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <Title level={3} className="!mb-1">
                            <PlayCircleOutlined className="mr-2" />
                            {displayName}&apos;s Playlist
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
                            {staff.last_reported && (
                                <Text type="secondary">
                                    Last Reported: {new Date(staff.last_reported).toLocaleDateString()}
                                </Text>
                            )}
                        </Space>
                    </div>
                    <Link href={`/staff/view/${resolvedParams.id}/${resolvedParams.slug}/playlist/edit`}>
                        <Button type="primary" icon={<EditOutlined />}>
                            Edit Playlist
                        </Button>
                    </Link>
                </div>
            </Card>

            {/* Archive Navigation */}
            {archiveWeeks.length > 0 && (
                <Card className="mb-6" size="small">
                    <Space align="center">
                        <Text strong>Viewing:</Text>
                        <Select
                            value={selectedWeek}
                            onChange={handleWeekChange}
                            style={{ width: 220 }}
                            placeholder="Current Playlist"
                            allowClear
                            options={[
                                ...archiveWeeks.map(w => ({
                                    label: `Archive: ${w.week_ending}`,
                                    value: w.week_ending,
                                })),
                            ]}
                        />
                        {selectedWeek && (
                            <Tag color="blue">Viewing archived week: {selectedWeek}</Tag>
                        )}
                    </Space>
                </Card>
            )}

            {/* Playlist Table */}
            <Card>
                <Table
                    dataSource={entries}
                    columns={columns}
                    rowKey="id"
                    loading={tableLoading}
                    pagination={{
                        current: pagination.page,
                        pageSize: pagination.pageSize,
                        total: pagination.total,
                        showSizeChanger: true,
                        pageSizeOptions: ['100', '250', '500', '1000'],
                        showTotal: (total) => `${total} entries`,
                        onChange: (page, pageSize) => {
                            setPagination(prev => ({ ...prev, pageSize }));
                            loadEntries(page, selectedWeek);
                        },
                    }}
                    size="small"
                    scroll={{ x: 800 }}
                />
            </Card>
        </div>
    );
}
