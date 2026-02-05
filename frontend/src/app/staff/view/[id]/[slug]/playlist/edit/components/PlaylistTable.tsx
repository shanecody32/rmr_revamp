'use client';

import { DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { App, Button, InputNumber, Modal, Space, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useState } from 'react';

import type { PlaylistEntry } from '@/types/api/staff-playlists';

interface PlaylistTableProps {
    entries: PlaylistEntry[];
    loading: boolean;
    pagination: { page: number; pageSize: number; total: number };
    isFinalised: boolean;
    onUpdateSpins: (entryId: number, spins: number | null) => Promise<void>;
    onDeleteEntry: (entryId: number) => Promise<void>;
    onDeleteAll: () => Promise<void>;
    onPageChange: (page: number, pageSize: number) => void;
}

function SpinsCell({
    entry,
    isFinalised,
    onUpdateSpins,
}: {
    entry: PlaylistEntry;
    isFinalised: boolean;
    onUpdateSpins: (entryId: number, spins: number | null) => Promise<void>;
}) {
    const [value, setValue] = useState<number | null>(entry.spins);
    const [saving, setSaving] = useState(false);

    const handleBlur = useCallback(async () => {
        if (value === entry.spins) return;
        try {
            setSaving(true);
            await onUpdateSpins(entry.id, value);
        } finally {
            setSaving(false);
        }
    }, [entry.id, entry.spins, value, onUpdateSpins]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            (e.target as HTMLElement).blur();
        }
    }, []);

    if (isFinalised) {
        return <span>{entry.spins ?? '-'}</span>;
    }

    return (
        <InputNumber
            value={value}
            onChange={(v) => setValue(v)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            min={0}
            size="small"
            style={{ width: 80 }}
            disabled={saving}
            placeholder="-"
        />
    );
}

export default function PlaylistTable({
    entries,
    loading,
    pagination,
    isFinalised,
    onUpdateSpins,
    onDeleteEntry,
    onDeleteAll,
    onPageChange,
}: PlaylistTableProps) {
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [deleting, setDeleting] = useState(false);
    const { message, modal } = App.useApp();

    const handleDeleteSelected = useCallback(async () => {
        modal.confirm({
            title: 'Delete Selected Entries',
            icon: <ExclamationCircleOutlined />,
            content: `Are you sure you want to delete ${selectedRowKeys.length} selected entries?`,
            okText: 'Delete',
            okType: 'danger',
            onOk: async () => {
                try {
                    setDeleting(true);
                    for (const key of selectedRowKeys) {
                        await onDeleteEntry(Number(key));
                    }
                    setSelectedRowKeys([]);
                    message.success(`Deleted ${selectedRowKeys.length} entries`);
                } catch (err) {
                    console.error('Error deleting entries:', err);
                    message.error('Failed to delete some entries');
                } finally {
                    setDeleting(false);
                }
            },
        });
    }, [selectedRowKeys, onDeleteEntry, message, modal]);

    const handleDeleteAll = useCallback(() => {
        modal.confirm({
            title: 'Remove All Entries',
            icon: <ExclamationCircleOutlined />,
            content: 'Are you sure you want to remove ALL playlist entries? This cannot be undone.',
            okText: 'Remove All',
            okType: 'danger',
            onOk: onDeleteAll,
        });
    }, [onDeleteAll, modal]);

    const columns: ColumnsType<PlaylistEntry> = [
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
            width: 120,
            sorter: (a, b) => (a.spins || 0) - (b.spins || 0),
            render: (_: unknown, record: PlaylistEntry) => (
                <SpinsCell
                    entry={record}
                    isFinalised={isFinalised}
                    onUpdateSpins={onUpdateSpins}
                />
            ),
        },
    ];

    if (!isFinalised) {
        columns.push({
            title: '',
            key: 'actions',
            width: 60,
            render: (_: unknown, record: PlaylistEntry) => (
                <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    size="small"
                    onClick={() => {
                        modal.confirm({
                            title: 'Delete Entry',
                            icon: <ExclamationCircleOutlined />,
                            content: `Delete ${record.band_name} - ${record.song_name}?`,
                            okText: 'Delete',
                            okType: 'danger',
                            onOk: () => onDeleteEntry(record.id),
                        });
                    }}
                />
            ),
        });
    }

    return (
        <div>
            {/* Bulk Actions Toolbar */}
            {!isFinalised && (
                <div className="mb-4 flex items-center justify-between">
                    <Space>
                        {selectedRowKeys.length > 0 && (
                            <Button
                                danger
                                icon={<DeleteOutlined />}
                                onClick={handleDeleteSelected}
                                loading={deleting}
                            >
                                Delete Selected ({selectedRowKeys.length})
                            </Button>
                        )}
                    </Space>
                    <Button
                        danger
                        type="text"
                        onClick={handleDeleteAll}
                        disabled={entries.length === 0}
                    >
                        Remove All Entries
                    </Button>
                </div>
            )}

            <Table
                dataSource={entries}
                columns={columns}
                rowKey="id"
                loading={loading}
                rowSelection={
                    !isFinalised
                        ? {
                              selectedRowKeys,
                              onChange: setSelectedRowKeys,
                          }
                        : undefined
                }
                pagination={{
                    current: pagination.page,
                    pageSize: pagination.pageSize,
                    total: pagination.total,
                    showSizeChanger: true,
                    pageSizeOptions: ['100', '250', '500', '1000'],
                    showTotal: (total) => `${total} entries`,
                    onChange: onPageChange,
                }}
                size="small"
                scroll={{ x: 800 }}
            />
        </div>
    );
}
