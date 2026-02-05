'use client'


import {
    CloseOutlined,
    CustomerServiceOutlined,
    EditOutlined,
    EnvironmentOutlined,
    ExpandOutlined,
    FacebookOutlined,
    GlobalOutlined,
    InfoCircleOutlined,
    InstagramOutlined,
    ToolOutlined,
    TwitterOutlined,
    WarningOutlined,
    YoutubeOutlined
} from '@ant-design/icons';
import {App, Button, Card, Col, Descriptions, Row, Space, Tabs, Tag, Typography} from 'antd';
import Image from 'next/image';
import Link from 'next/link';
import {use, useEffect, useMemo, useState} from 'react';

import DiscographyTab from '@/components/common/data/DetailView/Tabs/DiscographyTab';
import LocationDisplay from '@/components/common/data/LocationDisplay';
import LoadingSpinner from '@/components/common/feedback/LoadingSpinner';
import WebsiteLink from '@/components/common/navigation/WebsiteLink';
import {useLocation} from '@/contexts/LocationContext';
import {useNavigationContext} from '@/hooks/useNavigationContext';
import DOMPurify from 'dompurify';
import {fetchBandDetail} from '@/lib/api/bands';
import {buildImageUrl} from '@/lib/utils/media';
import {StatusTag} from '@/lib/utils/status';
import type {BandDetailView} from '@/types/api/bands';

const {Title, Text} = Typography;


function EmptyFieldTag() {
    return (
        <Tag icon={<WarningOutlined/>} color="warning">
            Empty
        </Tag>
    );
}

interface ImagePreviewProps {
    src: string;
    alt: string;
    onClose: () => void;
}

function ImagePreview({src, alt, onClose}: ImagePreviewProps) {
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div className="relative max-w-7xl max-h-[90vh] w-full">
                <Image
                    src={src}
                    alt={alt}
                    className="max-w-full max-h-[90vh] object-contain mx-auto"
                    onClick={(e) => e.stopPropagation()}
                    width={1200}
                    height={800}
                    style={{width: 'auto', height: 'auto'}}
                    priority
                />
                <Button
                    type="text"
                    icon={<CloseOutlined/>}
                    className="absolute top-4 right-4 text-white hover:text-gray-300"
                    onClick={onClose}
                />
            </div>
        </div>
    );
}

interface BandViewContentProps {
    params: Promise<{ id: string; slug: string }>;
}

export default function BandViewContent({params}: BandViewContentProps) {
    const resolvedParams = use(params);
    const [band, setBand] = useState<BandDetailView | null>(null);
    const [loading, setLoading] = useState(true);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const {message} = App.useApp();
    const {addCityToCache} = useLocation();
    const nav = useNavigationContext('bands');

    const sortedImages = useMemo(() => {
        if (!band?.images?.length) return [];
        return [...band.images].sort((a, b) => (a.order || 0) - (b.order || 0));
    }, [band?.images]);

    useEffect(() => {
        const loadBand = async () => {
            try {
                setLoading(true);
                const data = await fetchBandDetail(parseInt(resolvedParams.id), { includeAlbums: true });
                setBand(data);

                // Add city to location context cache if available
                if (data.city) {
                    addCityToCache({
                        id: data.city.id,
                        name: data.city.name,
                        slug: data.city.slug,
                        new: false,
                        country_id: 0,
                        state_id: 0,
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
    }, [resolvedParams.id, message, addCityToCache]);

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

    const items = [
        {
            key: 'about',
            label: (
                <span className="flex items-center gap-1">
          <InfoCircleOutlined/>
          <span>About</span>
        </span>
            ),
            children: (
                <div className="space-y-8">
                    {/* Band Images */}
                    <div className="mb-8">
                        <Title level={4} className="mb-4">Band Photos</Title>
                        <Row gutter={[16, 16]}>
                            {sortedImages.length > 0 ? (
                                sortedImages.map((image) => {
                                    const imageUrl = image.filename
                                        ? buildImageUrl(image.path, image.filename)
                                        : null;
                                    const thumbUrl = image.thumbname
                                        ? buildImageUrl(image.path, image.thumbname)
                                        : null;

                                    if (!imageUrl) return null;

                                    return (
                                        <Col key={image.id} xs={24} sm={12} md={8}>
                                            <div className="relative group overflow-hidden rounded-lg">
                                                <Image
                                                    src={thumbUrl || imageUrl}
                                                    alt={`${band.name} photo`}
                                                    className="w-full aspect-[16/9] object-cover"
                                                    width={800}
                                                    height={450}
                                                    style={{width: '100%', height: 'auto'}}
                                                />
                                                <div
                                                    className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                                                    <Button
                                                        type="primary"
                                                        icon={<EditOutlined/>}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            message.info('Edit functionality coming soon');
                                                        }}
                                                    >
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        type="primary"
                                                        icon={<ExpandOutlined/>}
                                                        onClick={() => setPreviewImage(imageUrl)}
                                                    >
                                                        View
                                                    </Button>
                                                </div>
                                            </div>
                                        </Col>
                                    );
                                })
                            ) : (
                                <Col span={24}>
                                    <Text type="secondary" italic>No photos available.</Text>
                                </Col>
                            )}
                        </Row>
                    </div>

                    {/* Bio Section */}
                    <div>
                        <Title level={4} className="mb-4">Biography</Title>
                        <Card className="prose max-w-none">
                            {band.bio ? (
                                <div dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(band.bio)}}/>
                            ) : (
                                <Text type="secondary" italic>No biography available yet.</Text>
                            )}
                        </Card>
                    </div>

                    {/* Contact & Social */}
                    <div>
                        <Title level={4} className="mb-4">Contact & Social Media</Title>
                        <Row gutter={[16, 16]}>
                            <Col xs={24} md={12}>
                                <Card title="Contact Information" size="small">
                                    <div className="space-y-4">
                                        <div>
                                            <Text strong>Website</Text><br/>
                                            {band.website ? (
                                                <WebsiteLink href={band.website}/>
                                            ) : (
                                                <EmptyFieldTag/>
                                            )}
                                        </div>
                                        <div>
                                            <Text strong>Email</Text><br/>
                                            {band.email || <EmptyFieldTag/>}
                                        </div>
                                        <div>
                                            <Text strong>Location</Text><br/>
                                            <LocationDisplay
                                                countryId={band.country_id}
                                                stateId={band.state_id}
                                                cityId={band.city_id}
                                            />
                                        </div>
                                    </div>
                                </Card>
                            </Col>
                            <Col xs={24} md={12}>
                                <Card title="Social Media" size="small">
                                    <Space orientation="vertical" className="w-full">
                                        {band.facebook_url && (
                                            <Button
                                                icon={<FacebookOutlined/>}
                                                href={band.facebook_url}
                                                target="_blank"
                                                block
                                            >
                                                Facebook
                                            </Button>
                                        )}
                                        {band.twitter && (
                                            <Button
                                                icon={<TwitterOutlined/>}
                                                href={`https://twitter.com/${band.twitter}`}
                                                target="_blank"
                                                block
                                            >
                                                Twitter
                                            </Button>
                                        )}
                                        {band.instagram_url && (
                                            <Button
                                                icon={<InstagramOutlined/>}
                                                href={band.instagram_url}
                                                target="_blank"
                                                block
                                            >
                                                Instagram
                                            </Button>
                                        )}
                                        {band.youtube_url && (
                                            <Button
                                                icon={<YoutubeOutlined/>}
                                                href={band.youtube_url}
                                                target="_blank"
                                                block
                                            >
                                                YouTube
                                            </Button>
                                        )}
                                        {!band.facebook_url && !band.twitter && !band.instagram_url && !band.youtube_url && (
                                            <Text type="secondary" italic>No social media links available</Text>
                                        )}
                                    </Space>
                                </Card>
                            </Col>
                        </Row>
                    </div>

                    {/* Genres */}
                    <div>
                        <Title level={4} className="mb-4">Genres</Title>
                        <Card size="small">
                            <Space orientation="vertical" className="w-full">
                                <div>
                                    <Text strong>Primary Genres</Text><br/>
                                    <Space wrap className="mt-2">
                                        {band.genres?.map(genre => (
                                            <span key={genre.id}>
                                                <Tag color="blue" className="text-base py-1 px-3">
                                                    {genre.name}
                                                </Tag>
                                            </span>
                                        ))}
                                        {(!band.genres || band.genres.length === 0) && <EmptyFieldTag/>}
                                    </Space>
                                </div>
                                <div className="mt-4">
                                    <Text strong>Sub-Genres</Text><br/>
                                    <Space wrap className="mt-2">
                                        {band.sub_genres?.map(subGenre => (
                                            <span key={subGenre.id}>
                                                <Tag color="purple" className="text-base py-1 px-3">
                                                    {subGenre.name}
                                                </Tag>
                                            </span>
                                        ))}
                                        {(!band.sub_genres || band.sub_genres.length === 0) && <EmptyFieldTag/>}
                                    </Space>
                                </div>
                            </Space>
                        </Card>
                    </div>
                </div>
            )
        },
        {
            key: 'discography',
            label: (
                <span className="flex items-center gap-1">
          <CustomerServiceOutlined/>
          <span>Discography</span>
        </span>
            ),
            children: <DiscographyTab albums={band.albums || []}/>
        },
        {
            key: 'admin',
            label: (
                <span className="flex items-center gap-1">
          <ToolOutlined/>
          <span>Admin Info</span>
        </span>
            ),
            children: (
                <div className="space-y-8">
                    <Card title="Status Information" size="small">
                        <Descriptions column={2} bordered>
                            <Descriptions.Item label="Verified">
                                <Tag color={band.verified ? 'success' : 'error'}>
                                    {band.verified ? 'Yes' : 'No'}
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Verified By">
                                {band.verified_by_id || <EmptyFieldTag/>}
                            </Descriptions.Item>
                            <Descriptions.Item label="Approved">
                                <Tag color={band.approved ? 'success' : 'error'}>
                                    {band.approved ? 'Yes' : 'No'}
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Approved By">
                                {band.approved_by_id || <EmptyFieldTag/>}
                            </Descriptions.Item>
                            <Descriptions.Item label="Created At" span={1}>
                                {new Date(band.created_at).toLocaleString()}
                            </Descriptions.Item>
                            <Descriptions.Item label="Updated At" span={1}>
                                {new Date(band.updated_at).toLocaleString()}
                            </Descriptions.Item>
                        </Descriptions>
                    </Card>

                    <Card title="External IDs" size="small">
                        <Descriptions column={2} bordered>
                            <Descriptions.Item label="iTunes ID">
                                {band.itunes_id || <EmptyFieldTag/>}
                            </Descriptions.Item>
                            <Descriptions.Item label="AMG ID">
                                {band.amg_id || <EmptyFieldTag/>}
                            </Descriptions.Item>
                            <Descriptions.Item label="Rovi ID">
                                {band.rovi_id || <EmptyFieldTag/>}
                            </Descriptions.Item>
                            <Descriptions.Item label="Echo ID">
                                {band.echo_id || <EmptyFieldTag/>}
                            </Descriptions.Item>
                            <Descriptions.Item label="7digital ID">
                                {band.seven_digital_id || <EmptyFieldTag/>}
                            </Descriptions.Item>
                            <Descriptions.Item label="Discogs ID">
                                {band.discogs_id || <EmptyFieldTag/>}
                            </Descriptions.Item>
                            <Descriptions.Item label="Spotify ID">
                                {band.spotify_id || <EmptyFieldTag/>}
                            </Descriptions.Item>
                            <Descriptions.Item label="Rdio ID">
                                {band.rdio_id || <EmptyFieldTag/>}
                            </Descriptions.Item>
                        </Descriptions>
                    </Card>
                </div>
            )
        }
    ];

    return (
        <div>
            {/* Header Section */}
            <Card className="mb-6">
                <div className="flex flex-wrap items-start gap-6">
                    {/* Profile Image */}
                    {band.images && band.images.length > 0 && band.images[0].filename ? (
                        <div
                            className="w-32 h-32 rounded-lg bg-gray-100 shadow-sm flex items-center justify-center overflow-hidden">
                            <Image
                                src={buildImageUrl(band.images[0].path, band.images[0].thumbname || band.images[0].filename)}
                                alt={band.name}
                                className="w-full h-full object-cover"
                                width={128}
                                height={128}
                            />
                        </div>
                    ) : (
                        <div
                            className="w-32 h-32 rounded-lg bg-gray-200 shadow-sm flex items-center justify-center overflow-hidden">
                            <span className="text-4xl font-semibold text-gray-400">
                                {band.name?.charAt(0)?.toUpperCase() || '?'}
                            </span>
                        </div>
                    )}

                    {/* Title and Meta Info */}
                    <div className="flex-1">
                        <div className="flex items-start justify-between flex-wrap gap-4">
                            <div>
                                <Title level={2} className="!mb-2">{band.name}</Title>
                                <Space size="middle" wrap>
                                    <Text className="text-gray-600 flex items-center gap-1">
                                        <EnvironmentOutlined/>
                                        <LocationDisplay
                                            countryId={band.country_id}
                                            stateId={band.state_id}
                                            cityId={band.city_id}
                                        />
                                    </Text>
                                    {band.website && (
                                        <Text className="flex items-center gap-1">
                                            <GlobalOutlined/>
                                            <WebsiteLink href={band.website}/>
                                        </Text>
                                    )}
                                </Space>
                            </div>
                            <Space>
                                <Link href={nav.createContextualHref(`/bands/edit/${band.id}/${band.slug}`)}>
                                    <Button
                                        type="primary"
                                        icon={<EditOutlined/>}
                                    >
                                        Edit Band
                                    </Button>
                                </Link>
                                <StatusTag verified={band.verified} approved={band.approved}/>
                            </Space>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Content Tabs */}
            <Card>
                <Tabs
                    defaultActiveKey="about"
                    items={items}
                    size="large"
                    className="band-profile-tabs"
                />
            </Card>

            {/* Image Preview Modal */}
            {previewImage && (
                <ImagePreview
                    src={previewImage}
                    alt={band.name}
                    onClose={() => setPreviewImage(null)}
                />
            )}

            <style jsx global>{`
        .band-profile-tabs .ant-tabs-nav {
          margin-bottom: 24px;
        }

        .band-profile-tabs .ant-tabs-tab {
          padding: 12px 0;
          font-size: 16px;
        }

        .band-profile-tabs .ant-tabs-tab + .ant-tabs-tab {
          margin-left: 32px;
        }

        .ant-descriptions-bordered .ant-descriptions-item-label {
          background-color: #fafafa;
          width: 200px;
        }
      `}</style>
        </div>
    );
}
