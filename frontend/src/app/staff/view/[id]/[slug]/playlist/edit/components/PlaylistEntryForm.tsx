'use client';

import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { App, Button, InputNumber, Select, Space, Tag, Typography } from 'antd';
import { useCallback, useRef, useState, useEffect } from 'react';

import { fetchSimilarBands, createBand, fetchBandDiscographySummary } from '@/lib/api/bands';
import type { SimilarBand } from '@/lib/api/bands';
import type { AlbumSummary } from '@/types/api/bands';
import { fetchSimilarSongs, createSong } from '@/lib/api/songs';
import type { SimilarSong } from '@/lib/api/songs';
import { fetchUnknownAlbum, fetchAlbumSongs, type AlbumSong } from '@/lib/api/albums';
import type { CreatePlaylistEntryRequest } from '@/types/api/staff-playlists';
import CreateEntityWizardModal from './CreateEntityWizardModal';

const { Text } = Typography;

interface PlaylistEntryFormProps {
    staffId: number;
    onAddEntry: (request: CreatePlaylistEntryRequest) => Promise<void>;
}

const CREATE_NEW_BAND_VALUE = '__CREATE_NEW__';
const CREATE_NEW_SONG_VALUE = '__CREATE_NEW__';
const CREATE_NEW_ALBUM_VALUE = '__CREATE_NEW__';
const UNKNOWN_ALBUM_VALUE = '__UNKNOWN__';

export default function PlaylistEntryForm({ staffId, onAddEntry }: PlaylistEntryFormProps) {
    // Band state
    const [bandId, setBandId] = useState<number | null>(null);
    const [bandName, setBandName] = useState('');
    const [bandOptions, setBandOptions] = useState<{ value: string; label: React.ReactNode; name: string }[]>([]);
    const [bandSearching, setBandSearching] = useState(false);
    const [bandSearchTerm, setBandSearchTerm] = useState('');

    // Album state
    const [albumId, setAlbumId] = useState<number | null>(null);
    const [albumName, setAlbumName] = useState('');
    const [bandDiscography, setBandDiscography] = useState<AlbumSummary[]>([]);
    const [albumLoading, setAlbumLoading] = useState(false);

    // Song state
    const [songId, setSongId] = useState<number | null>(null);
    const [songName, setSongName] = useState('');
    const [songOptions, setSongOptions] = useState<{ value: string; label: React.ReactNode; name: string }[]>([]);
    const [songSearching, setSongSearching] = useState(false);
    const [songSearchTerm, setSongSearchTerm] = useState('');
    const [albumSongs, setAlbumSongs] = useState<AlbumSong[]>([]); // Songs loaded from selected album
    const [albumSongsLoading, setAlbumSongsLoading] = useState(false);

    // Other state
    const [spins, setSpins] = useState<number | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Wizard modal state
    const [wizardOpen, setWizardOpen] = useState(false);
    const [wizardEntityType, setWizardEntityType] = useState<'band' | 'album' | 'song'>('band');
    const [wizardInitialName, setWizardInitialName] = useState('');

    // Refs
    const songSelectRef = useRef<any>(null);
    const spinsRef = useRef<any>(null);
    const bandSelectRef = useRef<any>(null);
    const albumSelectRef = useRef<any>(null);
    const { message } = App.useApp();

    // Debounce timer refs
    const bandDebounceRef = useRef<NodeJS.Timeout | null>(null);
    const songDebounceRef = useRef<NodeJS.Timeout | null>(null);

    // Load discography when band is selected
    useEffect(() => {
        if (bandId) {
            setAlbumLoading(true);
            fetchBandDiscographySummary(bandId)
                .then((albums) => {
                    setBandDiscography(albums);
                })
                .catch((err) => {
                    console.error('Error fetching discography:', err);
                    setBandDiscography([]);
                })
                .finally(() => {
                    setAlbumLoading(false);
                });
        } else {
            setBandDiscography([]);
        }
    }, [bandId]);

    // Load album songs when an album is selected
    useEffect(() => {
        if (albumId) {
            setAlbumSongsLoading(true);
            fetchAlbumSongs(albumId)
                .then((songs) => {
                    setAlbumSongs(songs);
                    // Build song options from album songs
                    const options = songs.map((song) => ({
                        value: String(song.id),
                        name: song.name || 'Untitled',
                        label: <span>{song.name || 'Untitled'}</span>,
                    }));
                    // Add "Create New" option
                    options.push({
                        value: CREATE_NEW_SONG_VALUE,
                        name: '',
                        label: (
                            <div className="flex items-center gap-2 text-blue-600">
                                <PlusOutlined />
                                <span>Create New Song</span>
                            </div>
                        ),
                    });
                    setSongOptions(options);
                })
                .catch((err) => {
                    console.error('Error fetching album songs:', err);
                    setAlbumSongs([]);
                    setSongOptions([]);
                })
                .finally(() => {
                    setAlbumSongsLoading(false);
                });
        } else {
            setAlbumSongs([]);
            // Clear song options when no album selected - will use search
            setSongOptions([]);
        }
    }, [albumId]);

    // Build album options from discography
    const albumOptions = useCallback(() => {
        const options: { value: string; label: React.ReactNode; name: string }[] = [];

        // Add discography albums
        bandDiscography.forEach((album) => {
            const releaseYear = album.release_date ? new Date(album.release_date).getFullYear() : null;
            options.push({
                value: String(album.id),
                name: album.name || 'Untitled',
                label: (
                    <div className="flex items-center justify-between">
                        <span>{album.name || 'Untitled'}</span>
                        {releaseYear && (
                            <Tag color="default">{releaseYear}</Tag>
                        )}
                    </div>
                ),
            });
        });

        // Add "Unknown" option
        options.push({
            value: UNKNOWN_ALBUM_VALUE,
            name: 'Unknown',
            label: (
                <div className="flex items-center gap-2 text-gray-500 italic">
                    <span>Unknown Album</span>
                </div>
            ),
        });

        // Add "Create New" option
        options.push({
            value: CREATE_NEW_ALBUM_VALUE,
            name: '',
            label: (
                <div className="flex items-center gap-2 text-blue-600">
                    <PlusOutlined />
                    <span>Create New Album</span>
                </div>
            ),
        });

        return options;
    }, [bandDiscography]);

    const handleBandSearch = useCallback((value: string) => {
        setBandSearchTerm(value);
        if (bandDebounceRef.current) clearTimeout(bandDebounceRef.current);
        if (!value || value.length < 2) {
            setBandOptions([]);
            return;
        }
        bandDebounceRef.current = setTimeout(async () => {
            try {
                setBandSearching(true);
                const results = await fetchSimilarBands({
                    search_term: value,
                    min_similarity: 50,
                    limit: 20,
                });
                const options = results.map((band: SimilarBand) => ({
                    value: String(band.id),
                    name: band.name,
                    label: (
                        <div className="flex items-center justify-between">
                            <span>{band.name}</span>
                            <Tag color={band.similarity_score >= 80 ? 'green' : band.similarity_score >= 60 ? 'orange' : 'default'}>
                                {band.similarity_score}%
                            </Tag>
                        </div>
                    ),
                }));
                // Add "Create New" option
                options.push({
                    value: CREATE_NEW_BAND_VALUE,
                    name: value,
                    label: (
                        <div className="flex items-center gap-2 text-blue-600">
                            <PlusOutlined />
                            <span>Create New Band: &quot;{value}&quot;</span>
                        </div>
                    ),
                });
                setBandOptions(options);
            } catch (err) {
                console.error('Error searching bands:', err);
            } finally {
                setBandSearching(false);
            }
        }, 300);
    }, []);

    const handleBandSelect = useCallback(async (value: string) => {
        if (value === CREATE_NEW_BAND_VALUE) {
            // Open wizard for band creation
            setWizardEntityType('band');
            setWizardInitialName(bandSearchTerm);
            setWizardOpen(true);
            return;
        }

        const selected = bandOptions.find(o => o.value === value);
        setBandId(parseInt(value));
        setBandName(selected?.name || '');

        // Reset album and song
        setAlbumId(null);
        setAlbumName('');
        setSongId(null);
        setSongName('');
        setSongOptions([]);

        // Focus album input
        setTimeout(() => {
            albumSelectRef.current?.focus();
        }, 100);
    }, [bandSearchTerm, bandOptions]);

    const handleAlbumSelect = useCallback(async (value: string) => {
        if (value === CREATE_NEW_ALBUM_VALUE) {
            // Open wizard for album creation
            setWizardEntityType('album');
            setWizardInitialName('');
            setWizardOpen(true);
            return;
        }

        if (value === UNKNOWN_ALBUM_VALUE) {
            if (!bandId) return;
            try {
                setAlbumLoading(true);
                const unknownAlbum = await fetchUnknownAlbum(bandId);
                setAlbumId(unknownAlbum.id);
                setAlbumName('Unknown');
            } catch (err) {
                console.error('Error getting unknown album:', err);
                message.error('Failed to get/create unknown album');
                return;
            } finally {
                setAlbumLoading(false);
            }
        } else {
            const selected = bandDiscography.find(a => String(a.id) === value);
            setAlbumId(parseInt(value));
            setAlbumName(selected?.name || '');
        }

        // Reset song
        setSongId(null);
        setSongName('');
        setSongOptions([]);

        // Focus song input
        setTimeout(() => {
            songSelectRef.current?.focus();
        }, 100);
    }, [bandId, bandDiscography, message]);

    const handleSongSearch = useCallback((value: string) => {
        setSongSearchTerm(value);
        if (songDebounceRef.current) clearTimeout(songDebounceRef.current);
        if (!value || value.length < 2 || !bandId) {
            setSongOptions([]);
            return;
        }
        songDebounceRef.current = setTimeout(async () => {
            try {
                setSongSearching(true);
                const results = await fetchSimilarSongs({
                    search_term: value,
                    band_id: bandId,
                    restrict_to_parent: true,
                    min_similarity: 50,
                    limit: 20,
                });
                const options = results.map((song: SimilarSong) => ({
                    value: String(song.id),
                    name: song.name,
                    label: (
                        <div className="flex items-center justify-between">
                            <span>{song.name}</span>
                            <Tag color={song.similarity_score >= 80 ? 'green' : song.similarity_score >= 60 ? 'orange' : 'default'}>
                                {song.similarity_score}%
                            </Tag>
                        </div>
                    ),
                }));
                // Add "Create New" option
                options.push({
                    value: CREATE_NEW_SONG_VALUE,
                    name: value,
                    label: (
                        <div className="flex items-center gap-2 text-blue-600">
                            <PlusOutlined />
                            <span>Create New Song: &quot;{value}&quot;</span>
                        </div>
                    ),
                });
                setSongOptions(options);
            } catch (err) {
                console.error('Error searching songs:', err);
            } finally {
                setSongSearching(false);
            }
        }, 300);
    }, [bandId]);

    const handleSongSelect = useCallback(async (value: string) => {
        if (value === CREATE_NEW_SONG_VALUE) {
            // Open wizard for song creation
            setWizardEntityType('song');
            setWizardInitialName(songSearchTerm);
            setWizardOpen(true);
            return;
        }

        const selected = songOptions.find(o => o.value === value);
        setSongId(parseInt(value));
        setSongName(selected?.name || '');

        // Focus spins input
        setTimeout(() => {
            spinsRef.current?.focus();
        }, 100);
    }, [songSearchTerm, songOptions]);

    const handleWizardComplete = useCallback((entity: { id: number; name: string }) => {
        setWizardOpen(false);

        switch (wizardEntityType) {
            case 'band':
                setBandId(entity.id);
                setBandName(entity.name);
                // Reset album and song
                setAlbumId(null);
                setAlbumName('');
                setSongId(null);
                setSongName('');
                setSongOptions([]);
                setAlbumSongs([]);
                // Focus album input
                setTimeout(() => {
                    albumSelectRef.current?.focus();
                }, 100);
                break;
            case 'album':
                setAlbumId(entity.id);
                setAlbumName(entity.name);
                // Add to discography list so it shows in dropdown
                setBandDiscography(prev => [
                    ...prev,
                    { id: entity.id, name: entity.name, slug: null, release_date: null, img: null, image_url: null, song_count: 0, genre_name: null }
                ]);
                // Reset song - note: albumSongs will be loaded by useEffect when albumId changes
                setSongId(null);
                setSongName('');
                setSongOptions([]);
                // Focus song input
                setTimeout(() => {
                    songSelectRef.current?.focus();
                }, 100);
                break;
            case 'song':
                setSongId(entity.id);
                setSongName(entity.name);
                // Focus spins input
                setTimeout(() => {
                    spinsRef.current?.focus();
                }, 100);
                break;
        }
    }, [wizardEntityType]);

    const handleSubmit = useCallback(async () => {
        if (!bandId || !songId) {
            message.warning('Please select a band and song');
            return;
        }
        try {
            setSubmitting(true);
            await onAddEntry({
                staff_member_id: staffId,
                band_id: bandId,
                song_id: songId,
                album_id: albumId ?? undefined,
                spins: spins ?? undefined,
            });
            // Reset form
            setBandId(null);
            setBandName('');
            setAlbumId(null);
            setAlbumName('');
            setBandDiscography([]);
            setSongId(null);
            setSongName('');
            setSpins(null);
            setBandOptions([]);
            setSongOptions([]);
            setAlbumSongs([]);
            setBandSearchTerm('');
            setSongSearchTerm('');
            // Focus band input
            setTimeout(() => {
                bandSelectRef.current?.focus();
            }, 100);
        } finally {
            setSubmitting(false);
        }
    }, [bandId, songId, albumId, spins, staffId, onAddEntry, message]);

    const handleSpinsKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
        }
    }, [handleSubmit]);

    const handleClearBand = useCallback(() => {
        setBandId(null);
        setBandName('');
        setAlbumId(null);
        setAlbumName('');
        setBandDiscography([]);
        setSongId(null);
        setSongName('');
        setBandOptions([]);
        setSongOptions([]);
        setAlbumSongs([]);
    }, []);

    const handleClearAlbum = useCallback(() => {
        setAlbumId(null);
        setAlbumName('');
        setSongId(null);
        setSongName('');
        setSongOptions([]);
        setAlbumSongs([]);
    }, []);

    const handleClearSong = useCallback(() => {
        setSongId(null);
        setSongName('');
        setSongOptions([]);
    }, []);

    return (
        <>
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    {/* Band Select */}
                    <div className="md:col-span-3">
                        <Text strong className="block mb-1">Band</Text>
                        <Select
                            ref={bandSelectRef}
                            showSearch
                            value={bandId ? String(bandId) : undefined}
                            placeholder="Search for a band..."
                            filterOption={false}
                            onSearch={handleBandSearch}
                            onSelect={handleBandSelect}
                            options={bandOptions}
                            loading={bandSearching}
                            notFoundContent={bandSearching ? 'Searching...' : 'Type to search bands'}
                            suffixIcon={<SearchOutlined />}
                            className="w-full"
                            allowClear
                            onClear={handleClearBand}
                        />
                        {bandName && <Text type="secondary" className="text-xs mt-1 block">{bandName}</Text>}
                    </div>

                    {/* Album Select */}
                    <div className="md:col-span-3">
                        <Text strong className="block mb-1">Album</Text>
                        <Select
                            ref={albumSelectRef}
                            value={albumId ? String(albumId) : undefined}
                            placeholder={bandId ? 'Select an album...' : 'Select a band first'}
                            onSelect={handleAlbumSelect}
                            options={albumOptions()}
                            loading={albumLoading}
                            disabled={!bandId}
                            className="w-full"
                            allowClear
                            onClear={handleClearAlbum}
                        />
                        {albumName && <Text type="secondary" className="text-xs mt-1 block">{albumName}</Text>}
                    </div>

                    {/* Song Select */}
                    <div className="md:col-span-3">
                        <Text strong className="block mb-1">Song</Text>
                        <Select
                            ref={songSelectRef}
                            showSearch
                            value={songId ? String(songId) : undefined}
                            placeholder={
                                !bandId
                                    ? 'Select a band first'
                                    : albumId
                                        ? 'Select or search a song...'
                                        : 'Search for a song...'
                            }
                            filterOption={albumId
                                ? (input, option) => {
                                    // Local filtering for album songs
                                    const name = (option as { name?: string })?.name || '';
                                    return name.toLowerCase().includes(input.toLowerCase());
                                }
                                : false // Use API search when no album selected
                            }
                            onSearch={albumId ? undefined : handleSongSearch}
                            onSelect={handleSongSelect}
                            options={songOptions}
                            loading={songSearching || albumSongsLoading}
                            disabled={!bandId}
                            notFoundContent={
                                albumSongsLoading
                                    ? 'Loading songs...'
                                    : songSearching
                                        ? 'Searching...'
                                        : albumId
                                            ? 'No songs found on this album'
                                            : 'Type to search songs'
                            }
                            suffixIcon={<SearchOutlined />}
                            className="w-full"
                            allowClear
                            onClear={handleClearSong}
                        />
                        {songName && <Text type="secondary" className="text-xs mt-1 block">{songName}</Text>}
                    </div>

                    {/* Spins Input */}
                    <div className="md:col-span-1">
                        <Text strong className="block mb-1">Spins</Text>
                        <InputNumber
                            ref={spinsRef}
                            value={spins}
                            onChange={(value) => setSpins(value)}
                            min={0}
                            placeholder="0"
                            className="w-full"
                            onKeyDown={handleSpinsKeyDown}
                            disabled={!songId}
                        />
                    </div>

                    {/* Add Button */}
                    <div className="md:col-span-2">
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={handleSubmit}
                            loading={submitting}
                            disabled={!bandId || !songId}
                            className="w-full"
                        >
                            Add Entry
                        </Button>
                    </div>
                </div>
            </div>

            {/* Entity Creation Wizard Modal */}
            <CreateEntityWizardModal
                open={wizardOpen}
                entityType={wizardEntityType}
                onComplete={handleWizardComplete}
                onCancel={() => setWizardOpen(false)}
                bandId={bandId ?? undefined}
                bandName={bandName || undefined}
                albumId={albumId ?? undefined}
                albumName={albumName || undefined}
                initialName={wizardInitialName}
            />
        </>
    );
}
