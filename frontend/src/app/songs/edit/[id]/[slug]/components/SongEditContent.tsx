'use client'

import {App, Button, Card, Col, Form, Input, InputNumber, Row, Space, Typography} from 'antd';
import {useRouter} from 'next/navigation';
import {useEffect, useState} from 'react';

import LoadingSpinner from '@/components/common/feedback/LoadingSpinner';
import {fetchSongById, updateSong} from '@/lib/api/songs';
import {formatDate} from '@/lib/utils';
import type {SongResponse} from '@/types/api/songs';

const {Text} = Typography;

interface SongEditContentProps {
    id: string;
    slug: string;
}

export default function SongEditContent({id}: SongEditContentProps) {
    const router = useRouter();
    const {message} = App.useApp();
    const [form] = Form.useForm();
    const [song, setSong] = useState<SongResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const loadSong = async () => {
            try {
                setLoading(true);
                const data = await fetchSongById(parseInt(id));
                setSong(data);
                form.setFieldsValue({
                    name: data.name,
                    band_id: data.band_id,
                    sub_genre_id: data.sub_genre_id,
                    length: data.length,
                    release_date: data.release_date,
                    lyrics_writer: data.lyrics_writer,
                    music_writer: data.music_writer,
                    publisher: data.publisher,
                    license: data.license,
                    lyrics: data.lyrics,
                    itunes_url: data.itunes_url,
                    itunes_id: data.itunes_id,
                    rovi_id: data.rovi_id,
                    echo_id: data.echo_id,
                });
            } catch (error) {
                console.error('Error loading song:', error);
                message.error('Failed to load song');
            } finally {
                setLoading(false);
            }
        };

        loadSong();
    }, [id, form, message]);

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);

            const updated = await updateSong(parseInt(id), values);

            setSong(updated);
            message.success('Song updated successfully');
            router.push(`/songs/view/${updated.id}/${updated.slug}`);
        } catch (error) {
            if (error && typeof error === 'object' && 'errorFields' in error) return;
            console.error('Error updating song:', error);
            message.error('Failed to update song');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <LoadingSpinner className="min-h-screen" />;
    }

    if (!song) {
        return (
            <div className="p-6">
                <Text type="danger">Song not found</Text>
            </div>
        );
    }

    return (
        <div className="p-6">
            <Row gutter={[24, 24]}>
                <Col xs={24} lg={16}>
                    <Space direction="vertical" size="large" style={{width: '100%'}}>
                        <Card title="Basic Info">
                            <Form
                                form={form}
                                layout="vertical"
                                onFinish={handleSave}
                            >
                                <Row gutter={16}>
                                    <Col xs={24} sm={12}>
                                        <Form.Item
                                            name="name"
                                            label="Name"
                                            rules={[{required: true, message: 'Please enter a song name'}]}
                                        >
                                            <Input />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} sm={12}>
                                        <Form.Item name="band_id" label="Band ID">
                                            <InputNumber style={{width: '100%'}} />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} sm={12}>
                                        <Form.Item name="sub_genre_id" label="Sub-Genre ID">
                                            <InputNumber style={{width: '100%'}} />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} sm={12}>
                                        <Form.Item name="length" label="Length (seconds)">
                                            <InputNumber style={{width: '100%'}} min={0} />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} sm={12}>
                                        <Form.Item name="release_date" label="Release Date">
                                            <Input placeholder="YYYY-MM-DD" />
                                        </Form.Item>
                                    </Col>
                                </Row>

                                <Card type="inner" title="Credits & Rights" style={{marginBottom: 24}}>
                                    <Row gutter={16}>
                                        <Col xs={24} sm={12}>
                                            <Form.Item name="lyrics_writer" label="Lyrics Writer">
                                                <Input />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} sm={12}>
                                            <Form.Item name="music_writer" label="Music Writer">
                                                <Input />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} sm={12}>
                                            <Form.Item name="publisher" label="Publisher">
                                                <Input />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} sm={12}>
                                            <Form.Item name="license" label="License">
                                                <Input />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24}>
                                            <Form.Item name="lyrics" label="Lyrics">
                                                <Input.TextArea rows={6} />
                                            </Form.Item>
                                        </Col>
                                    </Row>
                                </Card>

                                <Card type="inner" title="External IDs" style={{marginBottom: 24}}>
                                    <Row gutter={16}>
                                        <Col xs={24} sm={12}>
                                            <Form.Item name="itunes_url" label="iTunes URL">
                                                <Input />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} sm={12}>
                                            <Form.Item name="itunes_id" label="iTunes ID">
                                                <InputNumber style={{width: '100%'}} />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} sm={12}>
                                            <Form.Item name="rovi_id" label="Rovi ID">
                                                <Input />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} sm={12}>
                                            <Form.Item name="echo_id" label="Echo ID">
                                                <Input />
                                            </Form.Item>
                                        </Col>
                                    </Row>
                                </Card>

                                <Form.Item>
                                    <Space>
                                        <Button type="primary" htmlType="submit" loading={saving}>
                                            Save Changes
                                        </Button>
                                        <Button onClick={() => router.push('/songs')}>
                                            Back to Songs
                                        </Button>
                                    </Space>
                                </Form.Item>
                            </Form>
                        </Card>
                    </Space>
                </Col>

                <Col xs={24} lg={8}>
                    <Card title="Song Info" size="small">
                        <div className="space-y-2">
                            <div>
                                <Text type="secondary">ID:</Text>
                                <Text className="ml-2">{song.id}</Text>
                            </div>
                            <div>
                                <Text type="secondary">Slug:</Text>
                                <Text className="ml-2">{song.slug}</Text>
                            </div>
                            <div>
                                <Text type="secondary">Verified:</Text>
                                <Text className="ml-2">{song.verified ? 'Yes' : 'No'}</Text>
                            </div>
                            <div>
                                <Text type="secondary">Approved:</Text>
                                <Text className="ml-2">{song.approved ? 'Yes' : 'No'}</Text>
                            </div>
                            <div>
                                <Text type="secondary">Created:</Text>
                                <Text className="ml-2">{formatDate(song.created_at)}</Text>
                            </div>
                            <div>
                                <Text type="secondary">Updated:</Text>
                                <Text className="ml-2">{formatDate(song.updated_at)}</Text>
                            </div>
                        </div>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}
