'use client'

import { PlusOutlined, InboxOutlined, EyeOutlined } from '@ant-design/icons';
import { Modal, Form, Input, Upload, Select, Space, Button, message, Image, Typography } from 'antd';
import type { UploadFile, UploadProps } from 'antd';
import * as React from 'react';

import { useCreateAlbum } from '@/hooks/api/useAlbums';
import type { AlbumResponse } from '@/types/api/albums';

const { Dragger } = Upload;
const { TextArea } = Input;

interface AddAlbumModalProps {
    visible: boolean;
    onCancel: () => void;
    onSuccess: () => void;
    bandId?: number;
}

interface AlbumFormData {
    name: string;
    description?: string;
    release_date?: string;
    band_id?: number;
    label_id?: number;
}

export default function AddAlbumModal({ visible, onCancel, onSuccess, bandId }: AddAlbumModalProps) {
    const [form] = Form.useForm<AlbumFormData>();
    const [fileList, setFileList] = React.useState<UploadFile[]>([]);
    const [uploading, setUploading] = React.useState(false);
    
    const { createAlbum, isCreating } = useCreateAlbum();

    const handleSubmit = async (values: AlbumFormData) => {
        try {
            setUploading(true);
            
            // Create album first
            const albumData: Partial<AlbumResponse> = {
                ...values,
                band_id: bandId,
            };
            
            const result = await createAlbum(albumData);
            
            if (result && fileList.length > 0) {
                // Upload images after album creation
                await uploadAlbumImages(result.id, fileList);
            }
            
            message.success('Album created successfully');
            form.resetFields();
            setFileList([]);
            onSuccess();
            
        } catch (error) {
            console.error('Error creating album:', error);
            message.error('Failed to create album');
        } finally {
            setUploading(false);
        }
    };

    const uploadAlbumImages = async (albumId: number, files: UploadFile[]) => {
        const formData = new FormData();
        
        files.forEach((file, index) => {
            if (file.originFileObj) {
                // Determine image type based on file name or order
                let imageType = 'cover';
                if (file.name.toLowerCase().includes('back')) {
                    imageType = 'back';
                } else if (file.name.toLowerCase().includes('insert')) {
                    imageType = 'insert';
                } else if (index > 0) {
                    imageType = 'back'; // Second image defaults to back
                }
                
                formData.append('images', file.originFileObj);
                formData.append(`image_types`, imageType);
            }
        });
        
        formData.append('album_id', albumId.toString());
        formData.append('maintain_seo_structure', 'true');
        
        // Upload to SEO-friendly path: /bands/{band-slug-id}/albums/{album-slug}.jpg
        const response = await fetch('/api/albums/upload-images', {
            method: 'POST',
            body: formData,
        });
        
        if (!response.ok) {
            throw new Error('Failed to upload images');
        }
    };

    const uploadProps: UploadProps = {
        name: 'images',
        multiple: true,
        fileList,
        beforeUpload: (file) => {
            const isImage = file.type?.startsWith('image/');
            if (!isImage) {
                message.error('You can only upload image files!');
                return false;
            }
            
            const isLt10M = file.size / 1024 / 1024 < 10;
            if (!isLt10M) {
                message.error('Image must smaller than 10MB!');
                return false;
            }
            
            return false; // Prevent auto upload
        },
        onChange: (info) => {
            setFileList(info.fileList);
        },
        onDrop: (e) => {
            console.log('Dropped files', e.dataTransfer.files);
        },
        accept: 'image/*',
    };

    const handleCancel = () => {
        form.resetFields();
        setFileList([]);
        onCancel();
    };

    return (
        <Modal
            title="Add New Album"
            open={visible}
            onCancel={handleCancel}
            footer={null}
            width={600}
            destroyOnClose
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                initialValues={{
                    band_id: bandId,
                }}
            >
                <Form.Item
                    name="name"
                    label="Album Name"
                    rules={[
                        { required: true, message: 'Please enter album name' },
                        { min: 2, message: 'Album name must be at least 2 characters' },
                    ]}
                >
                    <Input placeholder="Enter album name" />
                </Form.Item>

                <Form.Item
                    name="description"
                    label="Description"
                >
                    <TextArea 
                        rows={3} 
                        placeholder="Optional album description"
                        maxLength={500}
                        showCount
                    />
                </Form.Item>

                <Form.Item
                    name="release_date"
                    label="Release Date"
                >
                    <Input type="date" />
                </Form.Item>

                {!bandId && (
                    <Form.Item
                        name="band_id"
                        label="Band"
                        rules={[{ required: true, message: 'Please select a band' }]}
                    >
                        <Select
                            placeholder="Select band"
                            showSearch
                            optionFilterProp="children"
                        >
                            {/* TODO: Load bands from API */}
                        </Select>
                    </Form.Item>
                )}

                <Form.Item
                    name="label_id"
                    label="Record Label"
                >
                    <Select
                        placeholder="Select record label (optional)"
                        showSearch
                        optionFilterProp="children"
                        allowClear
                    >
                        {/* TODO: Load labels from API */}
                    </Select>
                </Form.Item>

                <Form.Item label="Album Images">
                    <Dragger {...uploadProps}>
                        <p className="ant-upload-drag-icon">
                            <InboxOutlined />
                        </p>
                        <p className="ant-upload-text">
                            Click or drag images to this area to upload
                        </p>
                        <p className="ant-upload-hint">
                            Support for album cover, back cover, and insert images. 
                            Images will be automatically resized and optimized.
                        </p>
                    </Dragger>
                    
                    {fileList.length > 0 && (
                        <div style={{ marginTop: 16 }}>
                            <Typography.Text strong>Image Preview:</Typography.Text>
                            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                                {fileList.map((file, index) => (
                                    <div key={file.uid} style={{ position: 'relative' }}>
                                        <Image
                                            width={100}
                                            height={100}
                                            src={file.url || (file.originFileObj ? URL.createObjectURL(file.originFileObj) : '')}
                                            alt={`Album image ${index + 1}`}
                                            style={{ objectFit: 'cover', borderRadius: 4 }}
                                            preview={{
                                                mask: <EyeOutlined />,
                                            }}
                                        />
                                        <Typography.Text 
                                            style={{ 
                                                fontSize: 10, 
                                                display: 'block', 
                                                textAlign: 'center',
                                                marginTop: 2,
                                                color: '#666'
                                            }}
                                        >
                                            {index === 0 ? 'Cover' : index === 1 ? 'Back' : 'Insert'}
                                        </Typography.Text>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </Form.Item>

                <Form.Item>
                    <Space>
                        <Button onClick={handleCancel}>
                            Cancel
                        </Button>
                        <Button 
                            type="primary" 
                            htmlType="submit"
                            loading={isCreating || uploading}
                            icon={<PlusOutlined />}
                        >
                            Create Album
                        </Button>
                    </Space>
                </Form.Item>
            </Form>
        </Modal>
    );
}