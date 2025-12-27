'use client'

import {Alert, Button, Card, Col, Divider, Empty, Modal, Radio, Row, Space, Spin, Tabs, Tag, Typography} from 'antd';
import {useEffect, useState} from 'react';

import LocationDisplay from '@/components/common/data/LocationDisplay';
import ResponsiveImage from '@/components/common/layout/ResponsiveImage';
import {fetchBandById, mergeBands} from '@/lib/api/bands';
import {getBandImageUrl, getFallbackImageUrl} from '@/lib/utils/media';
import type {BandWithDiscographyResponse} from '@/types/api/bands';

const {Title, Text} = Typography;

const FALLBACK_IMAGE = getFallbackImageUrl();

interface BandComparisonItem {
    id: number;
    name: string;
    data: BandWithDiscographyResponse;
    loading: boolean;
    error: string | null;
}

type MergeFieldValue = {
    value: any;
    sourceId: number;
};

interface BandMergeComparisonModalProps {
    open: boolean;
    onCancel: () => void;
    originalBandId: number;
    selectedBandIds: number[];
    onMergeComplete: (mergedBand: BandWithDiscographyResponse) => void;
}

const FIELD_GROUPS = [
    {
        key: 'basic',
        title: 'Basic Information',
        fields: [
            {key: 'name', label: 'Name'},
            {key: 'bio', label: 'Biography'},
        ]
    },
    {
        key: 'location',
        title: 'Location',
        fields: [
            {key: 'location_display', label: 'Location', special: 'location'},
            {key: 'country_id', label: 'Country ID', hidden: true},
            {key: 'state_id', label: 'State ID', hidden: true},
            {key: 'city_id', label: 'City ID', hidden: true},
        ]
    },
    {
        key: 'contact',
        title: 'Contact Information',
        fields: [
            {key: 'website', label: 'Website'},
            {key: 'email', label: 'Email'},
        ]
    },
    {
        key: 'social',
        title: 'Social Media',
        fields: [
            {key: 'facebook_url', label: 'Facebook URL'},
            {key: 'twitter', label: 'Twitter Username'},
            {key: 'instagram_url', label: 'Instagram URL'},
            {key: 'youtube_url', label: 'YouTube URL'},
            {key: 'lastfm_url', label: 'Last.fm URL'},
            {key: 'reverb_url', label: 'Reverb URL'},
            {key: 'wikipedia_url', label: 'Wikipedia URL'},
            {key: 'myspace_url', label: 'MySpace URL'},
            {key: 'cdbaby_url', label: 'CD Baby URL'},
            {key: 'pinterest_url', label: 'Pinterest URL'},
        ]
    },
    {
        key: 'ids',
        title: 'External IDs',
        fields: [
            {key: 'spotify_id', label: 'Spotify ID'},
            {key: 'itunes_id', label: 'iTunes ID'},
            {key: 'amg_id', label: 'AMG ID'},
            {key: 'rovi_id', label: 'Rovi ID'},
            {key: 'echo_id', label: 'Echo ID'},
            {key: 'seven_digital_id', label: '7digital ID'},
            {key: 'discogs_id', label: 'Discogs ID'},
            {key: 'rdio_id', label: 'Rdio ID'},
        ]
    },
    {
        key: 'status',
        title: 'Status',
        fields: [
            {key: 'verified', label: 'Verified'},
            {key: 'approved', label: 'Approved'},
        ]
    }
];

export default function BandMergeComparisonModal({
                                                     open,
                                                     onCancel,
                                                     originalBandId,
                                                     selectedBandIds,
                                                     onMergeComplete
                                                 }: BandMergeComparisonModalProps) {
    const [allBands, setAllBands] = useState<BandComparisonItem[]>([]);
    const [selectedValues, setSelectedValues] = useState<Record<string, MergeFieldValue>>({});
    const [activeTab, setActiveTab] = useState<string>('basic');
    const [initialLoading, setInitialLoading] = useState(true);
    const [merging, setMerging] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load all band data
    useEffect(() => {
        if (!open) return;

        const loadBands = async () => {
            setInitialLoading(true);
            setError(null);

            // Initialize band data structure
            const bandIds = [originalBandId, ...selectedBandIds];
            const initialBands = bandIds.map(id => ({
                id,
                name: `Band ${id}`,
                data: {} as BandWithDiscographyResponse,
                loading: true,
                error: null
            }));

            setAllBands(initialBands);

            // Load each band's data
            for (const id of bandIds) {
                try {
                    const bandData = await fetchBandById(id);

                    setAllBands(prev => prev.map(band =>
                        band.id === id
                            ? {...band, name: bandData.name, data: bandData, loading: false, error: null}
                            : band
                    ));

                } catch (err) {
                    console.error(`Error loading band ${id}:`, err);
                    setAllBands(prev => prev.map(band =>
                        band.id === id
                            ? {...band, loading: false, error: 'Failed to load band data'}
                            : band
                    ));
                }
            }

            setInitialLoading(false);
        };

        loadBands();
    }, [open, originalBandId, selectedBandIds]);

    // Initialize selected values with original band's data
    useEffect(() => {
        if (!open || initialLoading) return;

        const originalBand = allBands.find(band => band.id === originalBandId);
        if (!originalBand || !originalBand.data) return;

        const initialSelections: Record<string, MergeFieldValue> = {};

        // Initialize selections with the original band's values
        FIELD_GROUPS.forEach(group => {
            group.fields.forEach((field: { key: string; label: string; special?: string; hidden?: boolean }) => {
                // Skip special fields like location_display
                if (field.special) return;

                // Skip hidden fields
                if (field.hidden) return;

                const key = field.key as keyof BandWithDiscographyResponse;
                const value = originalBand.data[key];
                if (value !== undefined) {
                    initialSelections[key] = {value, sourceId: originalBandId};
                }
            });
        });

        // Handle location (country_id, state_id, city_id) as a group
        if (originalBand.data.country_id || originalBand.data.state_id || originalBand.data.city_id) {
            initialSelections.country_id = {value: originalBand.data.country_id, sourceId: originalBandId};
            initialSelections.state_id = {value: originalBand.data.state_id, sourceId: originalBandId};
            initialSelections.city_id = {value: originalBand.data.city_id, sourceId: originalBandId};
        }

        setSelectedValues(initialSelections);
    }, [open, initialLoading, allBands, originalBandId]);

    const handleSelectValue = (fieldKey: string, value: any, sourceId: number) => {
        if (fieldKey === 'location_display') {
            // When selecting location, we need to set country_id, state_id, and city_id
            const selectedBand = allBands.find(b => b.id === sourceId);
            if (!selectedBand) return;

            setSelectedValues(prev => ({
                ...prev,
                country_id: {value: selectedBand.data.country_id, sourceId},
                state_id: {value: selectedBand.data.state_id, sourceId},
                city_id: {value: selectedBand.data.city_id, sourceId}
            }));
        } else {
            // Normal field selection
            setSelectedValues(prev => ({
                ...prev,
                [fieldKey]: {value, sourceId}
            }));
        }
    };

    const handleMerge = async () => {
        try {
            setMerging(true);
            setError(null);

            // Prepare the merged data object
            const mergedData: Partial<BandWithDiscographyResponse> = {};

            // Add all selected values to the merged data
            Object.entries(selectedValues).forEach(([key, data]) => {
                mergedData[key as keyof BandWithDiscographyResponse] = data.value;
            });

            // Call the merge API
            const result = await mergeBands({
                from_ids: selectedBandIds,
                into_id: originalBandId,
                merged_data: mergedData
            });

            // Notify parent component about successful merge
            onMergeComplete(result as BandWithDiscographyResponse);

        } catch (err) {
            console.error('Error merging bands:', err);
            setError('Failed to merge bands. Please try again later.');
        } finally {
            setMerging(false);
        }
    };

    // Render the field comparison with radio buttons
    const renderFieldComparison = (field: { key: string; label: string; special?: string; hidden?: boolean }) => {
        // Skip hidden fields
        if (field.hidden) return null;

        const fieldKey = field.key;
        let selectedSourceId = null;

        // Handle special fields
        if (field.special === 'location') {
            // Use country_id to determine which band's location is selected
            selectedSourceId = selectedValues.country_id?.sourceId;
        } else {
            // Normal fields
            selectedSourceId = selectedValues[fieldKey]?.sourceId;
        }

        return (
            <div key={field.key} className="mb-6">
                <Text strong className="block mb-2">{field.label}</Text>
                <Radio.Group
                    value={selectedSourceId}
                    onChange={(e) => {
                        const selectedBandId = e.target.value;

                        if (field.special === 'location') {
                            handleSelectValue('location_display', null, selectedBandId);
                        } else {
                            const selectedBand = allBands.find(band => band.id === selectedBandId);
                            if (selectedBand) {
                                handleSelectValue(fieldKey, selectedBand.data[fieldKey as keyof BandWithDiscographyResponse], selectedBandId);
                            }
                        }
                    }}
                    className="w-full"
                >
                    <Row gutter={[16, 16]}>
                        {allBands.map(band => {
                            let displayValue;

                            if (field.special === 'location') {
                                // Render location using LocationDisplay component
                                displayValue = band.loading ? (
                                    <Spin size="small"/>
                                ) : (
                                    <LocationDisplay
                                        countryId={band.data.country_id}
                                        stateId={band.data.state_id}
                                        cityId={band.data.city_id}
                                    />
                                );
                            } else {
                                // Render normal field value
                                const value = band.data[fieldKey as keyof BandWithDiscographyResponse];
                                displayValue = typeof value === 'boolean'
                                    ? (value ? 'Yes' : 'No')
                                    : (typeof value === 'object' && value !== null
                                        ? JSON.stringify(value)
                                        : (value || '—'));
                            }

                            return (
                                <Col key={band.id} span={24}>
                                    <Radio value={band.id} disabled={band.loading}>
                                        <div className="pl-2">
                                            <Text
                                                className={band.id === originalBandId ? 'text-blue-600 font-medium' : ''}>
                                                {band.name}:
                                            </Text>
                                            <Text className="ml-2">
                                                {band.loading ? <Spin size="small"/> : displayValue}
                                            </Text>
                                        </div>
                                    </Radio>
                                </Col>
                            );
                        })}
                    </Row>
                </Radio.Group>
                <Divider className="my-4"/>
            </div>
        );
    };

    // Render band images display (not selection)
    const renderImagesDisplay = () => {
        return (
            <div className="mb-6">
                <Text strong className="block mb-4">Band Photos</Text>
                <div className="text-sm mb-4">
                    All images from all bands will be preserved in the merged band.
                </div>

                <Row gutter={[16, 16]}>
                    {allBands.map(band => (
                        <Col key={band.id} span={24}>
                            <div className="mb-4">
                                <Text strong className={band.id === originalBandId ? 'text-blue-600' : ''}>
                                    {band.name}
                                </Text>
                                {band.loading ? (
                                    <Spin/>
                                ) : !band.data.images || band.data.images.length === 0 ? (
                                    <div className="py-4">
                                        <Empty description="No images found"/>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-2">
                                        {band.data.images.map(image => {
                                            const imageUrl = getBandImageUrl(image);

                                            return (
                                                <div key={image.id} className="image-card">
                                                    <div
                                                        className="aspect-square bg-gray-100 relative overflow-hidden rounded">
                                                        <ResponsiveImage
                                                            src={imageUrl}
                                                            alt={`${band.name} photo`}
                                                            className="w-full h-full"
                                                            objectFit="cover"
                                                        />
                                                        <div
                                                            className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 truncate">
                                                            {image.filename || 'Unknown'}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </Col>
                    ))}
                </Row>
            </div>
        );
    };

    // Render album cards for discography display (not selection)
    const renderDiscographyDisplay = () => {
        return (
            <div className="mb-6">
                <Text strong className="block mb-4">Albums</Text>
                <div className="text-sm mb-4">
                    All albums from all bands will be preserved in the merged band.
                </div>

                <Row gutter={[16, 16]}>
                    {allBands.map(band => (
                        <Col key={band.id} span={24}>
                            <div className="mb-4">
                                <Text strong className={band.id === originalBandId ? 'text-blue-600' : ''}>
                                    {band.name}
                                </Text>
                                {band.loading ? (
                                    <Spin/>
                                ) : !band.data.albums || band.data.albums.length === 0 ? (
                                    <div className="py-4">
                                        <Empty description="No albums found"/>
                                    </div>
                                ) : (
                                    <div className="space-y-4 mt-2">
                                        {band.data.albums.map(album => (
                                            <Card
                                                key={album.id}
                                                size="small"
                                                className="album-card"
                                            >
                                                <div className="flex items-start">
                                                    <div className="w-16 h-16 mr-4 flex-shrink-0">
                                                        <ResponsiveImage
                                                            src={album.img}
                                                            alt={album.name}
                                                            className="w-full h-full"
                                                            objectFit="cover"
                                                        />
                                                    </div>
                                                    <div>
                                                        <div className="font-medium">{album.name}</div>
                                                        <div className="text-gray-500 text-sm">
                                                            {album.release_date ? (
                                                                <span>Released: {new Date(album.release_date).getFullYear()}</span>
                                                            ) : 'No release date'}
                                                        </div>
                                                        <div className="text-gray-500 text-sm">
                                                            {album.songs?.length || 0} tracks
                                                        </div>
                                                        <div className="mt-1">
                                                            {album.genres?.map(genre => (
                                                                <Tag key={`genre-${album.id}-${genre.id}`} color="blue">
                                                                    {genre.name}
                                                                </Tag>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </Col>
                    ))}
                </Row>
            </div>
        );
    };

    const tabItems = [
        {
            key: 'basic',
            label: 'Basic Info',
            children:
                <div>{FIELD_GROUPS.filter(g => g.key === 'basic' || g.key === 'status').flatMap(g => g.fields).map(renderFieldComparison)}</div>
        },
        {
            key: 'location',
            label: 'Location',
            children:
                <div>{FIELD_GROUPS.filter(g => g.key === 'location').flatMap(g => g.fields).map(renderFieldComparison)}</div>
        },
        {
            key: 'contact',
            label: 'Contact & Social',
            children:
                <div>{FIELD_GROUPS.filter(g => g.key === 'contact' || g.key === 'social').flatMap(g => g.fields).map(renderFieldComparison)}</div>
        },
        {
            key: 'ids',
            label: 'External IDs',
            children:
                <div>{FIELD_GROUPS.filter(g => g.key === 'ids').flatMap(g => g.fields).map(renderFieldComparison)}</div>
        },
        {
            key: 'images',
            label: 'Images',
            children: renderImagesDisplay()
        },
        {
            key: 'discography',
            label: 'Discography',
            children: renderDiscographyDisplay()
        }
    ];

    return (
        <Modal
            title="Compare & Merge Bands"
            open={open}
            onCancel={onCancel}
            footer={[
                <Button key="back" onClick={onCancel} disabled={merging}>
                    Cancel
                </Button>,
                <Button
                    key="merge"
                    type="primary"
                    onClick={handleMerge}
                    loading={merging}
                    disabled={initialLoading || Object.keys(selectedValues).length === 0}
                >
                    Merge Bands
                </Button>
            ]}
            width={800}
            className="band-merge-modal"
        >
            {initialLoading ? (
                <div className="text-center py-12">
                    <Spin size="large"/>
                    <div className="mt-4">Loading band data...</div>
                </div>
            ) : (
                <>
                    <Alert
                        title="Merge Data Selection"
                        description={
                            <div>
                                <p>Select which data to keep for each field from the available bands.</p>
                                <p>The <Text className="text-blue-600 font-medium">original band</Text> will be kept,
                                    and other bands will be merged into it.</p>
                            </div>
                        }
                        type="info"
                        showIcon
                        className="mb-6"
                    />

                    {error && (
                        <Alert
                            title="Error"
                            description={error}
                            type="error"
                            showIcon
                            className="mb-6"
                        />
                    )}

                    <Tabs
                        activeKey={activeTab}
                        onChange={setActiveTab}
                        className="merge-tabs"
                        items={tabItems}
                    />

                    <Space direction="vertical" className="w-full mt-6">
                        <Alert
                            title="Warning"
                            description="Merging bands will delete the selected duplicate bands and keep only the original band with the merged data. This action cannot be undone."
                            type="warning"
                            showIcon
                        />
                    </Space>
                </>
            )}

            <style jsx global>{`
        .band-merge-modal .merge-tabs .ant-tabs-nav {
          margin-bottom: 24px;
        }
        .band-merge-modal .ant-card-body {
          padding: 12px;
        }
        .band-merge-modal .album-card {
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        .band-merge-modal .image-card {
          transition: all 0.3s ease;
        }
        .band-merge-modal .image-card:hover {
          transform: scale(1.02);
        }
      `}</style>
        </Modal>
    );
}
