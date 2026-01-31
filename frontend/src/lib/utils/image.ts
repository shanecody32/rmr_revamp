'use client'

export interface ImageUploadOptions {
    maxSize?: number; // in MB
    allowedTypes?: string[];
    maxDimensions?: {
        width: number;
        height: number;
    };
    quality?: number; // 0.1 to 1.0
}

export interface ProcessedImage {
    file: File;
    preview: string;
    dimensions: {
        width: number;
        height: number;
    };
}

const DEFAULT_OPTIONS: Required<ImageUploadOptions> = {
    maxSize: 10,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxDimensions: { width: 2048, height: 2048 },
    quality: 0.9,
};

export function validateImage(file: File, options: ImageUploadOptions = {}): string | null {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    
    // Check file type
    if (!opts.allowedTypes.includes(file.type)) {
        return `File type ${file.type} not allowed. Supported types: ${opts.allowedTypes.join(', ')}`;
    }
    
    // Check file size
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > opts.maxSize) {
        return `File size ${sizeMB.toFixed(1)}MB exceeds maximum of ${opts.maxSize}MB`;
    }
    
    return null;
}

export async function processImage(file: File, options: ImageUploadOptions = {}): Promise<ProcessedImage> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    
    return new Promise((resolve, reject) => {
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
            reject(new Error('Canvas not supported'));
            return;
        }
        
        img.onload = () => {
            let { width, height } = img;
            
            // Resize if needed
            if (width > opts.maxDimensions.width || height > opts.maxDimensions.height) {
                const ratio = Math.min(
                    opts.maxDimensions.width / width,
                    opts.maxDimensions.height / height
                );
                width *= ratio;
                height *= ratio;
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // Draw and compress
            ctx.drawImage(img, 0, 0, width, height);
            
            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(new Error('Failed to process image'));
                        return;
                    }
                    
                    const processedFile = new File([blob], file.name, {
                        type: file.type,
                        lastModified: Date.now(),
                    });
                    
                    resolve({
                        file: processedFile,
                        preview: canvas.toDataURL(),
                        dimensions: { width, height },
                    });
                },
                file.type,
                opts.quality
            );
        };
        
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = URL.createObjectURL(file);
    });
}

export function createThumbnail(file: File, size: number = 300): Promise<ProcessedImage> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
            reject(new Error('Canvas not supported'));
            return;
        }
        
        img.onload = () => {
            const { width, height } = img;
            
            // Create square thumbnail
            const minDimension = Math.min(width, height);
            const scale = size / minDimension;
            
            canvas.width = size;
            canvas.height = size;
            
            // Center crop
            const sourceX = (width - minDimension) / 2;
            const sourceY = (height - minDimension) / 2;
            
            ctx.drawImage(
                img,
                sourceX, sourceY, minDimension, minDimension,
                0, 0, size, size
            );
            
            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(new Error('Failed to create thumbnail'));
                        return;
                    }
                    
                    const thumbnailFile = new File([blob], `thumb_${file.name}`, {
                        type: file.type,
                        lastModified: Date.now(),
                    });
                    
                    resolve({
                        file: thumbnailFile,
                        preview: canvas.toDataURL(),
                        dimensions: { width: size, height: size },
                    });
                },
                file.type,
                0.8
            );
        };
        
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = URL.createObjectURL(file);
    });
}

export function getImageUrl(path: string, type: 'original' | 'thumbnail' = 'original'): string {
    if (!path) return '';

    // If it's already a full URL, return as-is
    if (path.startsWith('http')) {
        return path;
    }

    // For local images, construct the URL based on type
    if (type === 'thumbnail' && !path.includes('thumbnail')) {
        const parts = path.split('.');
        const ext = parts.pop();
        const name = parts.join('.');
        return `${name}-thumbnail.${ext}`;
    }

    return path;
}