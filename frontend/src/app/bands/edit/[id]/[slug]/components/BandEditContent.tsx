'use client'

import {
    CustomerServiceOutlined,
    EditOutlined,
    InfoCircleOutlined,
    PlusOutlined,
    SaveOutlined,
    ToolOutlined
} from '@ant-design/icons';
import {App, Avatar, Button, Card, Form, List, Space, Tabs, Typography} from 'antd';
import Link from 'next/link';
import {useEffect, useState} from 'react';

import CurrentLocationDisplay from '@/components/common/data/CurrentLocationDisplay';
import LoadingSpinner from '@/components/common/feedback/LoadingSpinner';
import {BaseFormField} from '@/components/common/forms/BaseFormField';
import {EmailInput} from '@/components/common/forms/fields/EmailInput';
import {RichTextInput} from '@/components/common/forms/fields/RichTextInput';
import {TextInput} from '@/components/common/forms/fields/TextInput';
import { BandImageManager } from '@/components/common/media';
import CityTypeahead from '@/components/common/typeahead/CityTypeahead';
import CountryTypeahead from '@/components/common/typeahead/CountryTypeahead';
import StateTypeahead from '@/components/common/typeahead/StateTypeahead';
import {fetchBandDetail, updateBand} from '@/lib/api/bands';
import {getAlbumDisplayImageUrl, getFallbackImageUrl} from '@/lib/utils/media';
import type {BandDetailView} from '@/types/api/bands';
import type {CityResponse, CountryResponse, StateResponse} from '@/types/api/locations';


const {Text} = Typography;

interface BandFormValues {
    name: string;
    bio?: string;
    website?: string;
    email?: string;
    facebook_url?: string;
    twitter?: string;
    instagram_url?: string;
    youtube_url?: string;
    spotify_id?: string;
    itunes_id?: string;
    amg_id?: string;
    rovi_id?: string;
    echo_id?: string;
    seven_digital_id?: string;
    discogs_id?: string;
    rdio_id?: string;
    wikipedia_url?: string;
    lastfm_url?: string;
    myspace_url?: string;
    cdbaby_url?: string;
    pinterest_url?: string;
    itunes_url?: string;
    reverb_url?: string;
    country_id?: number;
    state_id?: number;
    city_id?: number;
}

interface BandEditContentProps {
    id: string;
    slug: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function BandEditContent({id, slug}: BandEditContentProps) {
    // slug is used for routing but not needed in the component logic
    const [band, setBand] = useState<BandDetailView | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const {message} = App.useApp();
    const [form] = Form.useForm();

    // Location state
    const [selectedCountry, setSelectedCountry] = useState<CountryResponse>();
    const [selectedState, setSelectedState] = useState<StateResponse>();
    const [selectedCity, setSelectedCity] = useState<CityResponse>();

    useEffect(() => {
        const loadBand = async () => {
            try {
                setLoading(true);
                const data = await fetchBandDetail(parseInt(id), { includeAlbums: true });
                setBand(data);

                // Set initial form values
                form.setFieldsValue({
                    name: data.name,
                    bio: data.bio,
                    website: data.website || '',
                    email: data.email || '',
                    facebook_url: data.facebook_url || '',
                    twitter: data.twitter || '',
                    instagram_url: data.instagram_url || '',
                    youtube_url: data.youtube_url || '',
                    spotify_id: data.spotify_id || '',
                    itunes_id: data.itunes_id || '',
                    amg_id: data.amg_id || '',
                    rovi_id: data.rovi_id || '',
                    echo_id: data.echo_id || '',
                    seven_digital_id: data.seven_digital_id || '',
                    discogs_id: data.discogs_id || '',
                    rdio_id: data.rdio_id || '',
                    wikipedia_url: data.wikipedia_url || '',
                    lastfm_url: data.lastfm_url || '',
                    myspace_url: data.myspace_url || '',
                    cdbaby_url: data.cdbaby_url || '',
                    pinterest_url: data.pinterest_url || '',
                    itunes_url: data.itunes_url || '',
                    reverb_url: data.reverb_url || '',
                    country_id: data.country?.id,
                    state_id: data.state?.id,
                    city_id: data.city?.id
                });

                // Set initial location state
                if (data.country) {
                    setSelectedCountry({
                        ...data.country,
                        continent: '',
                        region: '',
                        iso_three_digit: '',
                        iso_two_digit: '',
                        chart: false,
                        created_at: '',
                        updated_at: '',
                    });
                }
                if (data.state) {
                    setSelectedState({
                        ...data.state,
                        country_id: 0,
                        abbrv: '',
                        chart: false,
                        new: false,
                        correct: false,
                        created_at: '',
                        updated_at: '',
                    });
                }
                if (data.city) {
                    setSelectedCity({
                        ...data.city,
                        country_id: 0,
                        state_id: 0,
                        new: false,
                        created_at: '',
                        updated_at: '',
                    });
                }
            } catch (err) {
                console.error('Error loading band:', err);
                message.error('Failed to load band details');
            } finally {
                setLoading(false);
            }
        };

        loadBand();
    }, [id, message, form]);

    const handleSave = async (values: BandFormValues) => {
        if (!band) return;

        try {
            setSaving(true);

            // Convert string IDs to numbers for API compatibility
            const processedValues = {
                ...values,
                itunes_id: values.itunes_id ? Number(values.itunes_id) : null,
                amg_id: values.amg_id ? Number(values.amg_id) : null,
                seven_digital_id: values.seven_digital_id ? Number(values.seven_digital_id) : null,
                discogs_id: values.discogs_id ? Number(values.discogs_id) : null,
                rdio_id: values.rdio_id ? Number(values.rdio_id) : null
            };

            await updateBand(Number(band.id), processedValues);
            message.success('Band updated successfully');
        } catch (err) {
            console.error('Error updating band:', err);
            message.error('Failed to update band');
        } finally {
            setSaving(false);
        }
    };

    // Handle location selection changes
    const handleCountryChange = (value: number | undefined, country: CountryResponse | undefined) => {
        setSelectedCountry(country);
        setSelectedState(undefined);
        setSelectedCity(undefined);
        form.setFieldsValue({
            state_id: undefined,
            city_id: undefined
        });
    };

    const handleStateChange = (value: number | undefined, state: StateResponse | undefined) => {
        setSelectedState(state);
        setSelectedCity(undefined);
        form.setFieldsValue({
            city_id: undefined
        });
    };

    const handleCityChange = (value: number | undefined, city: CityResponse | undefined) => {
        setSelectedCity(city);
    };

    const handleAddNewAlbum = () => {
        // This would typically navigate to an album creation page or show a modal
        message.info('Album creation functionality will be implemented soon');
    };

    if (loading) {
        return <LoadingSpinner className="min-h-screen"/>;
    }

    if (!band) {
        return (
            <Card className="m-6">
                <div className="text-center text-red-500">
                    Band not found
                </div>
            </Card>
        );
    }

    // Album cover fallback image
    const FALLBACK_IMAGE = getFallbackImageUrl();

    const items = [
        {
            key: 'basic',
            label: (
                <span className="flex items-center gap-1">
          <InfoCircleOutlined/>
          <span>Basic Info</span>
        </span>
            ),
            children: (
                <div className="space-y-6">
                    <Card title="Basic Information">
                        <TextInput
                            name="name"
                            label="Band Name"
                            required
                        />
                        <BaseFormField
                            name="bio"
                            label="Biography"
                        >
                            <RichTextInput rows={6}/>
                        </BaseFormField>
                    </Card>

                    <Card title="Location">
                        <CurrentLocationDisplay
                            countryId={band.country_id}
                            stateId={band.state_id}
                            cityId={band.city_id}
                        />

                        <BaseFormField name="country_id" label="Country">
                            <CountryTypeahead
                                value={selectedCountry?.id}
                                onChange={handleCountryChange}
                                onClear={() => handleCountryChange(undefined, undefined)}
                            />
                        </BaseFormField>
                        <BaseFormField name="state_id" label="State/Province">
                            <StateTypeahead
                                value={selectedState?.id}
                                countryId={selectedCountry?.id}
                                onChange={handleStateChange}
                                onClear={() => handleStateChange(undefined, undefined)}
                            />
                        </BaseFormField>
                        <BaseFormField name="city_id" label="City">
                            <CityTypeahead
                                value={selectedCity?.id}
                                countryId={selectedCountry?.id}
                                stateId={selectedState?.id}
                                onChange={handleCityChange}
                                onClear={() => handleCityChange(undefined, undefined)}
                            />
                        </BaseFormField>
                    </Card>

                    {/* Display genres as read-only */}
                    <Card title="Genres (Read-only)">
                        <div className="space-y-4">
                            <div>
                                <div className="font-medium mb-2">Primary Genres</div>
                                <div className="flex flex-wrap gap-2">
                                    {band.genres?.map(genre => (
                                        <div key={genre.id}
                                             className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full">
                                            {genre.name}
                                        </div>
                                    ))}
                                    {(!band.genres || band.genres.length === 0) && (
                                        <div className="text-gray-500 italic">No genres assigned</div>
                                    )}
                                </div>
                            </div>
                            <div>
                                <div className="font-medium mb-2">Sub-Genres</div>
                                <div className="flex flex-wrap gap-2">
                                    {band.sub_genres?.map(subGenre => (
                                        <div key={subGenre.id}
                                             className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full">
                                            {subGenre.name}
                                        </div>
                                    ))}
                                    {(!band.sub_genres || band.sub_genres.length === 0) && (
                                        <div className="text-gray-500 italic">No sub-genres assigned</div>
                                    )}
                                </div>
                            </div>
                            <div className="text-sm text-gray-500 mt-2">
                                Note: Genres are managed by the system and cannot be edited directly.
                            </div>
                        </div>
                    </Card>
                </div>
            )
        },
        {
            key: 'media',
            label: (
                <span className="flex items-center gap-1">
          <CustomerServiceOutlined/>
          <span>Media</span>
        </span>
            ),
            children: (
                <div className="space-y-6">
                    <BandImageManager bandId={Number(band.id)} bandSlug={band.slug || ''} maxImages={10} />

                    <Card
                        title="Albums"
                        extra={
                            <Button
                                type="primary"
                                icon={<PlusOutlined/>}
                                onClick={handleAddNewAlbum}
                            >
                                Add New Album
                            </Button>
                        }
                    >
                        {band.albums && band.albums.length > 0 ? (
                            <List
                                dataSource={band.albums}
                                renderItem={(album) => (
                                    <List.Item
                                        key={album.id}
                                        actions={[
                                            <Link key="edit" href={`/albums/edit/${album.id}/${album.slug}`}>
                                                <Button
                                                    icon={<EditOutlined/>}
                                                    type="text"
                                                >
                                                    Edit
                                                </Button>
                                            </Link>
                                        ]}
                                    >
                                        <List.Item.Meta
                                            avatar={
                                                <Avatar
                                                    src={getAlbumDisplayImageUrl(album)}
                                                    shape="square"
                                                    size={64}
                                                />
                                            }
                                            title={<Text strong>{album.name}</Text>}
                                            description={
                                                <div>
                                                    <div>{album.release_date ? new Date(album.release_date).getFullYear() : 'No release date'}</div>
                                                    <div>{album.songs?.length || 0} tracks</div>
                                                </div>
                                            }
                                        />
                                    </List.Item>
                                )}
                            />
                        ) : (
                            <div className="text-center p-4 text-gray-500">
                                No albums found for this band.
                            </div>
                        )}
                    </Card>
                </div>
            )
        },
        {
            key: 'social',
            label: (
                <span className="flex items-center gap-1">
          <ToolOutlined/>
          <span>Social & Links</span>
        </span>
            ),
            children: (
                <div className="space-y-6">
                    <Card title="Website & Email">
                        <TextInput
                            name="website"
                            label="Website"
                        />
                        <EmailInput
                            name="email"
                            label="Email"
                        />
                    </Card>

                    <Card title="Social Media Links">
                        <TextInput
                            name="facebook_url"
                            label="Facebook URL"
                        />
                        <TextInput
                            name="twitter"
                            label="Twitter URL"
                        />
                        <TextInput
                            name="instagram_url"
                            label="Instagram URL"
                        />
                        <TextInput
                            name="youtube_url"
                            label="YouTube URL"
                        />
                        <TextInput
                            name="lastfm_url"
                            label="Last.fm URL"
                        />
                        <TextInput
                            name="reverb_url"
                            label="Reverb URL"
                        />
                        <TextInput
                            name="wikipedia_url"
                            label="Wikipedia URL"
                        />
                        <TextInput
                            name="myspace_url"
                            label="MySpace URL"
                        />
                        <TextInput
                            name="cdbaby_url"
                            label="CD Baby URL"
                        />
                        <TextInput
                            name="pinterest_url"
                            label="Pinterest URL"
                        />
                    </Card>

                    <Card title="External IDs">
                        <TextInput
                            name="spotify_id"
                            label="Spotify ID"
                        />
                        <TextInput
                            name="itunes_url"
                            label="iTunes URL"
                        />
                        <TextInput
                            name="amg_id"
                            label="AMG ID"
                        />
                        <TextInput
                            name="rovi_id"
                            label="Rovi ID"
                        />
                        <TextInput
                            name="echo_id"
                            label="Echo ID"
                        />
                        <TextInput
                            name="seven_digital_id"
                            label="7digital ID"
                        />
                        <TextInput
                            name="discogs_id"
                            label="Discogs ID"
                        />
                        <TextInput
                            name="rdio_id"
                            label="Rdio ID"
                        />
                    </Card>
                </div>
            )
        }
    ];

    return (
        <div>
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSave}
                    className="band-edit-form"
                    preserve={false}
                    initialValues={{
                        website: band.website || '',
                        email: band.email || '',
                        facebook_url: band.facebook_url || '',
                        twitter: band.twitter || '',
                        instagram_url: band.instagram_url || '',
                        youtube_url: band.youtube_url || '',
                        // Include all other fields to ensure they're properly initialized
                    }}
                >
                    <Card
                        title={`Editing: ${band.name}`}
                        extra={
                            <Space>
                                <Button
                                    type="primary"
                                    icon={<SaveOutlined/>}
                                    onClick={() => form.submit()}
                                    loading={saving}
                                >
                                    Save Changes
                                </Button>
                            </Space>
                        }
                    >
                        <Tabs
                            defaultActiveKey="basic"
                            items={items}
                            size="large"
                            destroyOnHidden={false}
                        />
                    </Card>
                </Form>

            <style jsx global>{`
                .band-edit-form .ant-tabs-nav {
                    margin-bottom: 24px;
                }

                .band-edit-form .ant-tabs-tab {
                    padding: 12px 0;
                    font-size: 16px;
                }

                .band-edit-form .ant-tabs-tab + .ant-tabs-tab {
                    margin-left: 32px;
                }

                .band-edit-form .ant-card {
                    background: #fff;
                }

                .band-edit-form .ant-card-head {
                    border-bottom: 1px solid #f0f0f0;
                    padding: 16px 24px;
                }

                .band-edit-form .ant-card-body {
                    padding: 24px;
                }

                .band-edit-form .ant-form-item {
                    margin-bottom: 24px;
                }

                .band-edit-form .ant-form-item:last-child {
                    margin-bottom: 0;
                }
            `}</style>
        </div>
    );
}
