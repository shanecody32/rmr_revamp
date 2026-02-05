'use client';

import { PlusOutlined } from '@ant-design/icons';
import { App, Button, Input, Modal, Space, Steps, Typography } from 'antd';
import { useCallback, useState } from 'react';

import LabelTypeahead from '@/components/common/typeahead/LabelTypeahead';
import SubGenreTypeahead from '@/components/common/typeahead/SubGenreTypeahead';
import { createBand } from '@/lib/api/bands';
import { createAlbum } from '@/lib/api/albums';
import { createSong } from '@/lib/api/songs';

const { Text, Title } = Typography;

type EntityType = 'band' | 'album' | 'song';

interface CreateEntityWizardModalProps {
    open: boolean;
    entityType: EntityType;
    onComplete: (entity: { id: number; name: string }) => void;
    onCancel: () => void;
    // Context for scoped creation
    bandId?: number;
    bandName?: string;
    albumId?: number;
    albumName?: string;
    // Pre-filled name from search
    initialName?: string;
}

export default function CreateEntityWizardModal({
    open,
    entityType,
    onComplete,
    onCancel,
    bandId,
    bandName,
    albumId,
    albumName,
    initialName = '',
}: CreateEntityWizardModalProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [name, setName] = useState(initialName);
    const [subGenreId, setSubGenreId] = useState<number | undefined>(undefined);
    const [labelId, setLabelId] = useState<number | undefined>(undefined);
    const [creating, setCreating] = useState(false);
    const { message } = App.useApp();

    // Reset form when modal opens/closes or entity type changes
    const resetForm = useCallback(() => {
        setCurrentStep(0);
        setName(initialName);
        setSubGenreId(undefined);
        setLabelId(undefined);
    }, [initialName]);

    // Reset when modal opens
    useState(() => {
        if (open) {
            resetForm();
        }
    });

    const getSteps = () => {
        switch (entityType) {
            case 'band':
                return [
                    { title: 'Band Name', description: 'Enter the band name' },
                    { title: 'Confirm', description: 'Create the band' },
                ];
            case 'album':
                return [
                    { title: 'Album Name', description: 'Enter the album name' },
                    { title: 'Label', description: 'Select a label (optional)' },
                    { title: 'Confirm', description: 'Create the album' },
                ];
            case 'song':
                return [
                    { title: 'Song Name', description: 'Enter the song name' },
                    { title: 'Sub-Genre', description: 'Select the sub-genre (required)' },
                    { title: 'Confirm', description: 'Create the song' },
                ];
            default:
                return [];
        }
    };

    const steps = getSteps();

    const canProceed = () => {
        switch (entityType) {
            case 'band':
                if (currentStep === 0) return name.trim().length > 0;
                return true;
            case 'album':
                if (currentStep === 0) return name.trim().length > 0;
                return true;
            case 'song':
                if (currentStep === 0) return name.trim().length > 0;
                if (currentStep === 1) return subGenreId !== undefined;
                return true;
            default:
                return false;
        }
    };

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleCreate = async () => {
        try {
            setCreating(true);
            let result: { id: number; name: string };

            switch (entityType) {
                case 'band': {
                    const newBand = await createBand({ name: name.trim() });
                    result = { id: newBand.id, name: newBand.name };
                    message.success(`Created band: ${newBand.name}`);
                    break;
                }
                case 'album': {
                    if (!bandId) {
                        message.error('Band ID is required to create an album');
                        return;
                    }
                    const newAlbum = await createAlbum({
                        name: name.trim(),
                        label_id: labelId,
                        band_id: bandId, // Pass band_id so the backend can create the junction
                    });
                    result = { id: newAlbum.id, name: newAlbum.name || name.trim() };
                    message.success(`Created album: ${result.name}`);
                    break;
                }
                case 'song': {
                    if (!bandId) {
                        message.error('Band ID is required to create a song');
                        return;
                    }
                    if (!subGenreId) {
                        message.error('Sub-genre is required to create a song');
                        return;
                    }
                    const newSong = await createSong({
                        name: name.trim(),
                        band_id: bandId,
                        sub_genre_id: subGenreId,
                    });
                    result = { id: newSong.id, name: newSong.name || name.trim() };
                    message.success(`Created song: ${result.name}`);
                    break;
                }
                default:
                    return;
            }

            onComplete(result);
            resetForm();
        } catch (err) {
            console.error(`Error creating ${entityType}:`, err);
            message.error(`Failed to create ${entityType}`);
        } finally {
            setCreating(false);
        }
    };

    const handleCancel = () => {
        resetForm();
        onCancel();
    };

    const renderStepContent = () => {
        switch (entityType) {
            case 'band':
                if (currentStep === 0) {
                    return (
                        <div className="space-y-4">
                            <Text strong>Band Name</Text>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter band name"
                                size="large"
                                autoFocus
                            />
                        </div>
                    );
                }
                return (
                    <div className="space-y-4 text-center">
                        <Title level={4}>Create Band</Title>
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <Text strong className="block mb-2">Name:</Text>
                            <Text className="text-lg">{name}</Text>
                        </div>
                        <Text type="secondary">
                            This will create a new band with alias entries for similarity matching.
                        </Text>
                    </div>
                );

            case 'album':
                if (currentStep === 0) {
                    return (
                        <div className="space-y-4">
                            {bandName && (
                                <div className="bg-blue-50 p-3 rounded mb-4">
                                    <Text type="secondary">Creating album for band: </Text>
                                    <Text strong>{bandName}</Text>
                                </div>
                            )}
                            <Text strong>Album Name</Text>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter album name"
                                size="large"
                                autoFocus
                            />
                        </div>
                    );
                }
                if (currentStep === 1) {
                    return (
                        <div className="space-y-4">
                            <Text strong>Label (Optional)</Text>
                            <LabelTypeahead
                                value={labelId}
                                onChange={(value) => setLabelId(value)}
                                onClear={() => setLabelId(undefined)}
                                placeholder="Search for a label..."
                            />
                            <Text type="secondary" className="text-xs">
                                You can skip this step if the label is unknown.
                            </Text>
                        </div>
                    );
                }
                return (
                    <div className="space-y-4 text-center">
                        <Title level={4}>Create Album</Title>
                        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                            <div>
                                <Text strong className="block">Name:</Text>
                                <Text className="text-lg">{name}</Text>
                            </div>
                            {bandName && (
                                <div>
                                    <Text strong className="block">Band:</Text>
                                    <Text>{bandName}</Text>
                                </div>
                            )}
                            {labelId && (
                                <div>
                                    <Text strong className="block">Label ID:</Text>
                                    <Text>{labelId}</Text>
                                </div>
                            )}
                        </div>
                        <Text type="secondary">
                            This will create a new album linked to the band.
                        </Text>
                    </div>
                );

            case 'song':
                if (currentStep === 0) {
                    return (
                        <div className="space-y-4">
                            {bandName && (
                                <div className="bg-blue-50 p-3 rounded mb-4">
                                    <Text type="secondary">Creating song for: </Text>
                                    <Text strong>{bandName}</Text>
                                    {albumName && (
                                        <>
                                            <Text type="secondary"> on album: </Text>
                                            <Text strong>{albumName}</Text>
                                        </>
                                    )}
                                </div>
                            )}
                            <Text strong>Song Name</Text>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter song name"
                                size="large"
                                autoFocus
                            />
                        </div>
                    );
                }
                if (currentStep === 1) {
                    return (
                        <div className="space-y-4">
                            <div>
                                <Text strong className="block mb-2">
                                    Sub-Genre <Text type="danger">*</Text>
                                </Text>
                                <SubGenreTypeahead
                                    value={subGenreId}
                                    onChange={(value) => setSubGenreId(value)}
                                    onClear={() => setSubGenreId(undefined)}
                                />
                            </div>
                            <Text type="secondary" className="text-xs">
                                Sub-genre is required for songs to ensure proper chart categorization.
                            </Text>
                        </div>
                    );
                }
                return (
                    <div className="space-y-4 text-center">
                        <Title level={4}>Create Song</Title>
                        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                            <div>
                                <Text strong className="block">Name:</Text>
                                <Text className="text-lg">{name}</Text>
                            </div>
                            {bandName && (
                                <div>
                                    <Text strong className="block">Band:</Text>
                                    <Text>{bandName}</Text>
                                </div>
                            )}
                            {albumName && (
                                <div>
                                    <Text strong className="block">Album:</Text>
                                    <Text>{albumName}</Text>
                                </div>
                            )}
                            <div>
                                <Text strong className="block">Sub-Genre ID:</Text>
                                <Text>{subGenreId}</Text>
                            </div>
                        </div>
                        <Text type="secondary">
                            This will create a new song linked to the band with the selected sub-genre.
                        </Text>
                    </div>
                );

            default:
                return null;
        }
    };

    const getTitle = () => {
        switch (entityType) {
            case 'band':
                return 'Create New Band';
            case 'album':
                return 'Create New Album';
            case 'song':
                return 'Create New Song';
            default:
                return 'Create Entity';
        }
    };

    const isLastStep = currentStep === steps.length - 1;

    return (
        <Modal
            title={
                <Space>
                    <PlusOutlined />
                    <span>{getTitle()}</span>
                </Space>
            }
            open={open}
            onCancel={handleCancel}
            width={500}
            footer={
                <div className="flex justify-between">
                    <Button onClick={handleCancel}>Cancel</Button>
                    <Space>
                        {currentStep > 0 && (
                            <Button onClick={handlePrev}>Back</Button>
                        )}
                        {isLastStep ? (
                            <Button
                                type="primary"
                                onClick={handleCreate}
                                loading={creating}
                                icon={<PlusOutlined />}
                            >
                                Create {entityType.charAt(0).toUpperCase() + entityType.slice(1)}
                            </Button>
                        ) : (
                            <Button
                                type="primary"
                                onClick={handleNext}
                                disabled={!canProceed()}
                            >
                                Next
                            </Button>
                        )}
                    </Space>
                </div>
            }
        >
            <div className="py-4">
                <Steps
                    current={currentStep}
                    items={steps.map((s) => ({ title: s.title }))}
                    size="small"
                    className="mb-6"
                />
                <div className="min-h-[150px]">
                    {renderStepContent()}
                </div>
            </div>
        </Modal>
    );
}
