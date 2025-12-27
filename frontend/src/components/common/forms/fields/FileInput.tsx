'use client'


import {
    DeleteOutlined,
    EyeOutlined,
    FileImageOutlined,
    FileOutlined,
    FilePdfOutlined,
    UploadOutlined,
} from '@ant-design/icons';
import type {UploadFile, UploadProps} from 'antd';
import {Button, message, Progress, Space, Upload} from 'antd';
import Image from 'next/image';
import {useState} from 'react';

export interface FileInputProps {
    value?: UploadFile[];
    onChange?: (fileList: UploadFile[]) => void;
    maxSize?: number; // in MB
    accept?: string;
    multiple?: boolean;
    maxFiles?: number;
    showPreview?: boolean;
    disabled?: boolean;
    uploadAction?: string;
    onUploadProgress?: (percent: number) => void;
    onUploadSuccess?: (response: any) => void;
    onUploadError?: (error: any) => void;
}

export const FileInput: React.FC<FileInputProps> = ({
                                                        value = [],
                                                        onChange,
                                                        maxSize = 10, // Default 10MB
                                                        accept,
                                                        multiple = false,
                                                        maxFiles = 10,
                                                        showPreview = true,
                                                        disabled = false,
                                                        uploadAction = '/api/upload', // Replace with your upload endpoint
                                                        onUploadProgress,
                                                        onUploadSuccess,
                                                        onUploadError,
                                                    }) => {
    const [fileList, setFileList] = useState<UploadFile[]>(value);
    const [uploading, setUploading] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewFile, setPreviewFile] = useState<UploadFile | null>(null);

    // Convert maxSize to bytes
    const maxSizeBytes = maxSize * 1024 * 1024;

    const uploadProps: UploadProps = {
        name: 'file',
        multiple,
        disabled,
        accept,
        fileList,
        action: uploadAction,
        showUploadList: false, // We'll handle our own list display
        beforeUpload: (file) => {
            // Check file size
            if (file.size > maxSizeBytes) {
                message.error(`File must be smaller than ${maxSize}MB!`);
                return Upload.LIST_IGNORE;
            }

            // Check file count
            if (fileList.length >= maxFiles) {
                message.error(`You can only upload up to ${maxFiles} files!`);
                return Upload.LIST_IGNORE;
            }

            return true;
        },
        onChange: (info) => {
            const {file, fileList: newFileList} = info;

            // Update file list
            setFileList(newFileList);
            onChange?.(newFileList);

            // Handle status changes
            if (file.status === 'uploading') {
                setUploading(true);
                onUploadProgress?.(file.percent || 0);
            } else if (file.status === 'done') {
                setUploading(false);
                message.success(`${file.name} uploaded successfully`);
                onUploadSuccess?.(file.response);
            } else if (file.status === 'error') {
                setUploading(false);
                message.error(`${file.name} upload failed`);
                onUploadError?.(file.error);
            }
        },
        onDrop(e) {
            console.warn('Dropped files', e.dataTransfer.files);
        },
    };

    const getFileIcon = (file: UploadFile) => {
        const type = file.type || '';
        if (type.startsWith('image/')) return <FileImageOutlined/>;
        if (type === 'application/pdf') return <FilePdfOutlined/>;
        return <FileOutlined/>;
    };

    const handlePreview = async (file: UploadFile) => {
        if (!file.url && !file.preview) {
            if (file.originFileObj && file.type?.startsWith('image/')) {
                file.preview = await getBase64(file.originFileObj);
            }
        }
        setPreviewFile(file);
        setPreviewOpen(true);
    };

    const handleRemove = (file: UploadFile) => {
        const newFileList = fileList.filter((item) => item.uid !== file.uid);
        setFileList(newFileList);
        onChange?.(newFileList);
    };

    return (
        <div className="space-y-4">
            <Upload.Dragger {...uploadProps}>
                <p className="text-gray-500">
                    <UploadOutlined className="text-2xl mb-2"/>
                    <br/>
                    Click or drag files here to upload
                    <br/>
                    <small>
                        {accept ? `Accepted formats: ${accept}` : 'All file types supported'}
                        {` (Max: ${maxSize}MB)`}
                    </small>
                </p>
            </Upload.Dragger>

            {fileList.length > 0 && (
                <div className="space-y-2">
                    {fileList.map((file) => (
                        <div
                            key={file.uid}
                            className="flex items-center justify-between p-2 border rounded hover:bg-gray-50"
                        >
                            <div className="flex items-center space-x-2">
                                {getFileIcon(file)}
                                <span className="truncate max-w-[200px]">{file.name}</span>
                                {file.status === 'uploading' && (
                                    <Progress
                                        percent={Math.round(file.percent || 0)}
                                        size="small"
                                        className="w-24"
                                    />
                                )}
                            </div>
                            <Space>
                                {showPreview && file.type?.startsWith('image/') && (
                                    <Button
                                        type="text"
                                        icon={<EyeOutlined/>}
                                        onClick={() => handlePreview(file)}
                                    />
                                )}
                                <Button
                                    type="text"
                                    icon={<DeleteOutlined/>}
                                    onClick={() => handleRemove(file)}
                                    disabled={file.status === 'uploading'}
                                />
                            </Space>
                        </div>
                    ))}
                </div>
            )}

            {/* Preview Modal for images */}
            {previewFile && (
                <div
                    className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${
                        previewOpen ? '' : 'hidden'
                    }`}
                    onClick={() => setPreviewOpen(false)}
                >
                    <div className="max-w-3xl max-h-[90vh] p-4">
                        {previewFile.type?.startsWith('image/') ? (
                            <Image
                                src={previewFile.url || previewFile.preview || ''}
                                alt={previewFile.name || 'Preview'}
                                className="max-w-full max-h-full object-contain"
                                width={800}
                                height={600}
                                style={{width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '80vh'}}
                            />
                        ) : (
                            <div className="bg-white p-4 rounded">
                                <p>Preview not available for this file type</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// Helper function to generate base64 preview for images
const getBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });
};
