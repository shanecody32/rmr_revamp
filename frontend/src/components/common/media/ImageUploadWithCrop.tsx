import { UploadOutlined, ScissorOutlined, PictureOutlined } from '@ant-design/icons';
import { Upload, Button, Modal, message, Slider, Space } from 'antd';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import type { Area, Point } from 'react-easy-crop';

interface ImageUploadWithCropProps {
  onUpload: (file: File, thumbnail: File) => Promise<void>;
  maxSize?: number; // in MB
  acceptedFormats?: string[];
  maxMainImageWidth?: number; // Max width for main images
  maxThumbnailWidth?: number; // Max width for thumbnails
}

interface CropperState {
  crop: Point;
  zoom: number;
  aspect: number | undefined;
  croppedAreaPixels: Area | null;
}

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', error => reject(error));
    image.src = url;
  });

const getCroppedImg = async (
  imageSrc: string,
  pixelCrop: Area | null,
  rotation = 0,
  maxWidth?: number
): Promise<Blob | null> => {
  console.log('getCroppedImg called with:', { 
    imageSrc: imageSrc.substring(0, 50) + '...', 
    pixelCrop, 
    rotation,
    maxWidth 
  });
  
  if (!pixelCrop) {
    console.log('No pixelCrop provided, returning null');
    return null;
  }
  
  if (pixelCrop.width <= 0 || pixelCrop.height <= 0) {
    console.error('Invalid crop dimensions:', pixelCrop);
    return null;
  }

  try {
    const image = await createImage(imageSrc);
    console.log('Image loaded:', { width: image.width, height: image.height });
    
    // Calculate the output dimensions (with max width constraint)
    let outputWidth = pixelCrop.width;
    let outputHeight = pixelCrop.height;
    
    if (maxWidth && outputWidth > maxWidth) {
      const scale = maxWidth / outputWidth;
      outputWidth = maxWidth;
      outputHeight = Math.round(outputHeight * scale);
      console.log('Resizing image to:', { outputWidth, outputHeight, scale });
    }
    
    // Create a canvas for the cropped and resized image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      console.error('Failed to get canvas context');
      return null;
    }

    canvas.width = outputWidth;
    canvas.height = outputHeight;
    console.log('Canvas size:', { width: outputWidth, height: outputHeight });

    // Draw the cropped and resized image
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      outputWidth,
      outputHeight
    );
    console.log('Drew cropped and resized image');

    return new Promise((resolve) => {
      // Use lower quality for smaller file size
      const quality = maxWidth && maxWidth <= 300 ? 0.8 : 0.85;
      console.log('Using JPEG quality:', quality);
      
      canvas.toBlob(blob => {
        console.log('Canvas.toBlob result:', blob ? `${(blob.size / 1024).toFixed(2)}KB` : 'null');
        resolve(blob);
      }, 'image/jpeg', quality);
    });
  } catch (error) {
    console.error('Error in getCroppedImg:', error);
    return null;
  }
};

export const ImageUploadWithCrop: React.FC<ImageUploadWithCropProps> = ({
  onUpload,
  maxSize = 5, // 5MB default
  acceptedFormats = ['image/jpeg', 'image/png', 'image/webp'],
  maxMainImageWidth = 1200,
  maxThumbnailWidth = 300
}) => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [cropModalVisible, setCropModalVisible] = useState(false);
  const [thumbnailModalVisible, setThumbnailModalVisible] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [croppedMainBlob, setCroppedMainBlob] = useState<Blob | null>(null);
  const [uploading, setUploading] = useState(false);

  // Cropper state for main image
  const [mainCropperState, setMainCropperState] = useState<CropperState>({
    crop: { x: 0, y: 0 },
    zoom: 1,
    aspect: 16 / 9,
    croppedAreaPixels: null
  });

  // Cropper state for thumbnail
  const [thumbCropperState, setThumbCropperState] = useState<CropperState>({
    crop: { x: 0, y: 0 },
    zoom: 1,
    aspect: 1, // Square thumbnail
    croppedAreaPixels: null
  });

  const handleBeforeUpload: UploadProps['beforeUpload'] = (file) => {
    console.log('ImageUploadWithCrop.handleBeforeUpload called with file:', {
      name: file.name,
      size: file.size,
      type: file.type
    });
    
    const isValidFormat = acceptedFormats.includes(file.type);
    if (!isValidFormat) {
      message.error(`Please upload ${acceptedFormats.join(', ')} files only!`);
      return false;
    }

    const isValidSize = file.size / 1024 / 1024 < maxSize;
    if (!isValidSize) {
      message.error(`Image must be smaller than ${maxSize}MB!`);
      return false;
    }

    console.log('File validation passed, reading file...');
    // Read the file and open crop modal
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        console.log('File read successfully, opening crop modal');
        setCurrentImage(e.target.result as string);
        setCurrentFile(file);
        setCropModalVisible(true);
      }
    };
    reader.readAsDataURL(file);

    return false; // Prevent auto upload
  };

  const onMainCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    console.log('onMainCropComplete:', { croppedArea, croppedAreaPixels });
    setMainCropperState(prev => ({ ...prev, croppedAreaPixels }));
  }, []);

  const onThumbCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    console.log('onThumbCropComplete:', { croppedArea, croppedAreaPixels });
    setThumbCropperState(prev => ({ ...prev, croppedAreaPixels }));
  }, []);

  const handleMainCropConfirm = async () => {
    console.log('ImageUploadWithCrop.handleMainCropConfirm called');
    if (!currentImage || !mainCropperState.croppedAreaPixels) {
      console.log('Missing currentImage or mainCropperState.croppedAreaPixels');
      return;
    }

    try {
      console.log('Cropping main image...');
      const croppedBlob = await getCroppedImg(
        currentImage,
        mainCropperState.croppedAreaPixels,
        0,
        maxMainImageWidth
      );

      if (croppedBlob) {
        console.log('Main image cropped successfully, blob size:', croppedBlob.size);
        const croppedUrl = URL.createObjectURL(croppedBlob);
        setCroppedImage(croppedUrl);
        setCroppedMainBlob(croppedBlob); // Store the blob
        setCropModalVisible(false);
        setThumbnailModalVisible(true);
      } else {
        console.error('Failed to get cropped blob');
      }
    } catch (error) {
      console.error('Error cropping image:', error);
      message.error('Failed to crop image');
    }
  };

  const handleThumbnailConfirm = async () => {
    console.log('ImageUploadWithCrop.handleThumbnailConfirm called');
    console.log('Current state:', {
      hasCroppedImage: !!croppedImage,
      hasThumbCropperState: !!thumbCropperState.croppedAreaPixels,
      hasCurrentFile: !!currentFile
    });
    
    if (!croppedImage || !thumbCropperState.croppedAreaPixels || !currentFile) {
      console.log('Missing required data, returning early');
      return;
    }

    setUploading(true);
    try {
      console.log('Getting thumbnail blob...');
      // Get the thumbnail blob
      const thumbnailBlob = await getCroppedImg(
        croppedImage,
        thumbCropperState.croppedAreaPixels,
        0,
        maxThumbnailWidth
      );
      console.log('Thumbnail blob created:', thumbnailBlob);

      console.log('Using stored main image blob...');
      const mainImageBlob = croppedMainBlob;
      console.log('Main image blob:', mainImageBlob ? `exists (size: ${mainImageBlob.size})` : 'null');

      if (!thumbnailBlob) {
        console.error('Thumbnail blob is null');
      }
      if (!mainImageBlob) {
        console.error('Main image blob is null');
      }
      
      if (thumbnailBlob && mainImageBlob) {
        // Convert blobs to files
        const mainFile = new File([mainImageBlob], currentFile.name, { type: 'image/jpeg' });
        const thumbFile = new File([thumbnailBlob], `thumb_${currentFile.name}`, { type: 'image/jpeg' });
        
        console.log('Created files:', {
          mainFile: { name: mainFile.name, size: mainFile.size, type: mainFile.type },
          thumbFile: { name: thumbFile.name, size: thumbFile.size, type: thumbFile.type }
        });

        console.log('Calling onUpload prop...');
        // Call the upload handler
        await onUpload(mainFile, thumbFile);
        console.log('onUpload completed successfully');

        // Update file list for display
        setFileList([{
          uid: '-1',
          name: currentFile.name,
          status: 'done',
          url: URL.createObjectURL(mainImageBlob),
          thumbUrl: URL.createObjectURL(thumbnailBlob)
        }]);

        // Reset states
        setThumbnailModalVisible(false);
        setCroppedImage(null);
        setCroppedMainBlob(null);
        setCurrentImage(null);
        setCurrentFile(null);
      } else {
        console.error('Failed to create blobs');
      }
    } catch (error) {
      console.error('Error processing images:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setFileList([]);
  };

  return (
    <>
      <Upload
        listType="picture-card"
        fileList={fileList}
        beforeUpload={handleBeforeUpload}
        onRemove={handleRemove}
        maxCount={1}
        action=""
        customRequest={({ onSuccess }) => {
          if (onSuccess) onSuccess("ok", undefined as any);
        }}
      >
        {fileList.length === 0 && (
          <div>
            <UploadOutlined />
            <div style={{ marginTop: 8 }}>Upload Image</div>
          </div>
        )}
      </Upload>

      {/* Main Image Crop Modal */}
      <Modal
        title={<><ScissorOutlined /> Crop Main Image</>}
        open={cropModalVisible}
        onOk={handleMainCropConfirm}
        onCancel={() => setCropModalVisible(false)}
        width={800}
        okText="Next: Select Thumbnail"
      >
        <div style={{ position: 'relative', height: 400 }}>
          {currentImage && (
            <Cropper
              image={currentImage}
              crop={mainCropperState.crop}
              zoom={mainCropperState.zoom}
              aspect={mainCropperState.aspect}
              onCropChange={(crop) => setMainCropperState(prev => ({ ...prev, crop }))}
              onCropComplete={onMainCropComplete}
              onZoomChange={(zoom) => setMainCropperState(prev => ({ ...prev, zoom }))}
            />
          )}
        </div>
        <Space direction="vertical" style={{ width: '100%', marginTop: 16 }}>
          <div>
            <span>Zoom: </span>
            <Slider
              value={mainCropperState.zoom}
              min={1}
              max={3}
              step={0.1}
              onChange={(zoom) => setMainCropperState(prev => ({ ...prev, zoom }))}
              style={{ width: 200 }}
            />
          </div>
          <div>
            <span>Aspect Ratio: </span>
            <Button.Group>
              <Button 
                size="small"
                onClick={() => setMainCropperState(prev => ({ ...prev, aspect: 16/9 }))}
                type={mainCropperState.aspect === 16/9 ? 'primary' : 'default'}
              >
                16:9
              </Button>
              <Button 
                size="small"
                onClick={() => setMainCropperState(prev => ({ ...prev, aspect: 4/3 }))}
                type={mainCropperState.aspect === 4/3 ? 'primary' : 'default'}
              >
                4:3
              </Button>
              <Button 
                size="small"
                onClick={() => setMainCropperState(prev => ({ ...prev, aspect: 1 }))}
                type={mainCropperState.aspect === 1 ? 'primary' : 'default'}
              >
                1:1
              </Button>
              <Button 
                size="small"
                onClick={() => setMainCropperState(prev => ({ ...prev, aspect: undefined }))}
                type={mainCropperState.aspect === undefined ? 'primary' : 'default'}
              >
                Free
              </Button>
            </Button.Group>
          </div>
        </Space>
      </Modal>

      {/* Thumbnail Selection Modal */}
      <Modal
        title={<><PictureOutlined /> Select Thumbnail Area</>}
        open={thumbnailModalVisible}
        onOk={handleThumbnailConfirm}
        onCancel={() => setThumbnailModalVisible(false)}
        width={800}
        okText="Upload"
        confirmLoading={uploading}
      >
        <div style={{ position: 'relative', height: 400 }}>
          {croppedImage && (
            <Cropper
              image={croppedImage}
              crop={thumbCropperState.crop}
              zoom={thumbCropperState.zoom}
              aspect={thumbCropperState.aspect}
              onCropChange={(crop) => setThumbCropperState(prev => ({ ...prev, crop }))}
              onCropComplete={onThumbCropComplete}
              onZoomChange={(zoom) => setThumbCropperState(prev => ({ ...prev, zoom }))}
            />
          )}
        </div>
        <Space direction="vertical" style={{ width: '100%', marginTop: 16 }}>
          <div>
            <span>Zoom: </span>
            <Slider
              value={thumbCropperState.zoom}
              min={1}
              max={3}
              step={0.1}
              onChange={(zoom) => setThumbCropperState(prev => ({ ...prev, zoom }))}
              style={{ width: 200 }}
            />
          </div>
          <div style={{ color: '#666' }}>
            Thumbnail will be cropped as a square (1:1 aspect ratio)
          </div>
        </Space>
      </Modal>
    </>
  );
};
