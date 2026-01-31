import { DeleteOutlined, EyeOutlined, SortAscendingOutlined } from '@ant-design/icons';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, List, Button, Space, Spin, message, Modal, Image } from 'antd';
import React, { useState, useEffect } from 'react';


import { bandImagesApi } from '@/lib/api/band-images';
import { buildImageUrl } from '@/lib/utils/media';
import type { BandImageResponse } from '@/types/api/bands';

import { ImageUploadWithCrop } from '../../../components/common/media/ImageUploadWithCrop';

interface BandImageManagerProps {
  bandId: number;
  bandSlug: string;
  maxImages?: number;
}

interface SortableImageItemProps {
  image: BandImageResponse;
  bandSlug: string;
  onRemove: (id: number) => void;
  onView: (image: BandImageResponse) => void;
}

const SortableImageItem: React.FC<SortableImageItemProps> = ({ image, bandSlug, onRemove, onView }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <List.Item
        actions={[
          <Button
            key="view"
            icon={<EyeOutlined />}
            onClick={() => onView(image)}
            size="small"
          />,
          <Button
            key="delete"
            danger
            icon={<DeleteOutlined />}
            onClick={() => onRemove(image.id)}
            size="small"
          />,
        ]}
      >
        <List.Item.Meta
          avatar={
            <div {...attributes} {...listeners} style={{ cursor: 'grab' }}>
              <SortAscendingOutlined style={{ fontSize: 20, color: '#999' }} />
            </div>
          }
          title={image.filename || 'Untitled Image'}
          description={
            <Space>
              <span>Order: {image.order || 0}</span>
              {image.thumbname && <span>• Has thumbnail</span>}
            </Space>
          }
        />
        {image.thumbname && (
          <Image
            width={80}
            height={80}
            src={buildImageUrl(image.path, image.thumbname)}
            preview={false}
            style={{ objectFit: 'cover', borderRadius: 4 }}
          />
        )}
      </List.Item>
    </div>
  );
};

export const BandImageManager: React.FC<BandImageManagerProps> = ({
  bandId,
  bandSlug,
  maxImages = 10,
}) => {
  const [images, setImages] = useState<BandImageResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<BandImageResponse | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load existing images
  const loadImages = async () => {
    console.log('BandImageManager.loadImages called for bandId:', bandId, 'bandSlug:', bandSlug);
    setLoading(true);
    try {
      const data = await bandImagesApi.list(bandId);
      console.log('Loaded images from API:', data);
      
      // Log each image's path details
      data.forEach((img, index) => {
        console.log(`Image ${index}:`, {
          id: img.id,
          band_id: img.band_id,
          path: img.path,
          filename: img.filename,
          thumbname: img.thumbname,
          order: img.order
        });
      });
      
      setImages(data.sort((a, b) => (a.order || 0) - (b.order || 0)));
    } catch (error) {
      message.error('Failed to load images');
      console.error('Error loading images:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadImages();
  }, [bandId]);

  const handleUpload = async (mainFile: File, thumbnailFile: File) => {
    console.log('BandImageManager.handleUpload called with:', {
      mainFile: { name: mainFile.name, size: mainFile.size, type: mainFile.type },
      thumbnailFile: { name: thumbnailFile.name, size: thumbnailFile.size, type: thumbnailFile.type },
      bandId,
      bandSlug
    });
    
    setUploading(true);
    try {
      const newOrder = Math.max(...images.map(img => img.order || 0), 0) + 1;
      console.log('Calculated new order:', newOrder);
      
      console.log('Calling bandImagesApi.upload with params:', {
        bandId,
        mainImage: mainFile,
        thumbnail: thumbnailFile,
        order: newOrder,
      });
      
      const newImage = await bandImagesApi.upload({
        bandId,
        mainImage: mainFile,
        thumbnail: thumbnailFile,
        order: newOrder,
      });
      
      console.log('Upload successful, received response:', newImage);
      
      setImages([...images, newImage]);
      message.success('Image uploaded successfully');
    } catch (error) {
      console.error('Upload failed with error:', error);
      message.error('Failed to upload image');
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async (id: number) => {
    Modal.confirm({
      title: 'Delete Image',
      content: 'Are you sure you want to delete this image?',
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await bandImagesApi.delete(id);
          setImages(images.filter(img => img.id !== id));
          message.success('Image deleted successfully');
        } catch (error) {
          message.error('Failed to delete image');
          console.error(error);
        }
      },
    });
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = images.findIndex(img => img.id === active.id);
      const newIndex = images.findIndex(img => img.id === over.id);

      const newImages = arrayMove(images, oldIndex, newIndex);
      
      // Update order values
      const updatedImages = newImages.map((img, index) => ({
        ...img,
        order: index + 1,
      }));

      setImages(updatedImages);

      // Send reorder request to backend
      try {
        const updates = updatedImages.map(img => ({
          id: img.id,
          order: img.order || 0,
        }));
        await bandImagesApi.reorderImages(updates);
        message.success('Images reordered successfully');
      } catch (error) {
        message.error('Failed to save image order');
        console.error(error);
        // Revert on error
        await loadImages();
      }
    }
  };

  const handleView = (image: BandImageResponse) => {
    setPreviewImage(image);
  };

  return (
    <Card title="Band Images" extra={`${images.length} / ${maxImages} images`}>
      <Space orientation="vertical" style={{ width: '100%' }} size="large">
        {images.length < maxImages && (
          <ImageUploadWithCrop onUpload={handleUpload} />
        )}

        {loading ? (
          <Spin tip="Loading images..."><div /></Spin>
        ) : images.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={images.map(img => img.id)}
              strategy={verticalListSortingStrategy}
            >
              <List
                dataSource={images}
                renderItem={(image) => (
                  <SortableImageItem
                    key={image.id}
                    image={image}
                    bandSlug={bandSlug}
                    onRemove={handleRemove}
                    onView={handleView}
                  />
                )}
              />
            </SortableContext>
          </DndContext>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
            No images uploaded yet
          </div>
        )}
      </Space>

      {/* Preview Modal */}
      <Modal
        open={!!previewImage}
        footer={null}
        onCancel={() => setPreviewImage(null)}
        width={800}
      >
        {previewImage && (
          <div style={{ textAlign: 'center' }}>
            <Image
              src={buildImageUrl(previewImage.path, previewImage.filename)}
              alt={previewImage.filename || 'Band Image'}
              style={{ maxWidth: '100%' }}
            />
            <div style={{ marginTop: 16, color: '#666' }}>
              <p>Filename: {previewImage.filename}</p>
              <p>Order: {previewImage.order}</p>
              <p>Uploaded: {new Date(previewImage.created_at).toLocaleString()}</p>
            </div>
          </div>
        )}
      </Modal>
    </Card>
  );
};