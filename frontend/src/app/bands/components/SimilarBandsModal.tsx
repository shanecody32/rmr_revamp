'use client'

import {Button, Checkbox, List, message, Modal, Space, Tag} from 'antd';
import {useEffect, useState} from 'react';

import {StatusTag} from '@/lib/utils/status';

interface SimilarBand {
    id: number;
    name: string;
    similarity: number;
    verified: boolean;
    approved: boolean;
}

interface SimilarBandsModalProps {
    open: boolean;
    onCancel: () => void;
    onSelect: (band: SimilarBand) => void;
    onProceed: () => void;
    onMergeSelected?: (selectedBands: SimilarBand[]) => void;
    similarBands: SimilarBand[];
    newBandName: string;
    loading?: boolean;
    mode?: 'select-one' | 'select-multiple';
    maxSelections?: number;
}

export default function SimilarBandsModal({
                                              open,
                                              onCancel,
                                              onSelect,
                                              onProceed,
                                              onMergeSelected,
                                              similarBands,
                                              newBandName,
                                              loading = false,
                                              mode = 'select-one',
                                              maxSelections = Infinity
                                          }: SimilarBandsModalProps) {
    const [selectedBands, setSelectedBands] = useState<SimilarBand[]>([]);

    // Reset selections when modal opens/closes or similarBands change
    useEffect(() => {
        if (open && similarBands) {
            setSelectedBands([]);
        }
    }, [open, similarBands]);

    const handleToggleBand = (band: SimilarBand) => {
        if (selectedBands.some(b => b.id === band.id)) {
            setSelectedBands(selectedBands.filter(b => b.id !== band.id));
        } else {
            setSelectedBands([...selectedBands, band]);
        }
    };

    const handleCancel = () => {
        setSelectedBands([]);
        onCancel();
    };

    const handleMergeSelected = () => {
        if (selectedBands.length === 0) {
            message.warning('Please select at least one band to merge');
            return;
        }

        if (onMergeSelected) {
            onMergeSelected(selectedBands);
        }
    };

    // Create footer buttons based on mode
    const footerButtons = [];

    // Cancel button is always present
    footerButtons.push(
        <Button key="cancel" onClick={handleCancel} disabled={loading}>
            Cancel
        </Button>
    );

    // Add mode-specific buttons
    if (mode === 'select-multiple') {
        // Add a "Skip Merge" button to go directly to edit
        footerButtons.push(
            <Button
                key="skipMerge"
                onClick={onProceed}
                disabled={loading}
            >
                Skip Merge and Edit
            </Button>
        );

        footerButtons.push(
            <Button
                key="merge"
                type="primary"
                onClick={handleMergeSelected}
                disabled={selectedBands.length === 0 || loading}
                loading={loading}
            >
                Compare & Merge ({selectedBands.length})
            </Button>
        );
    } else {
        footerButtons.push(
            <Button
                key="proceed"
                type="primary"
                onClick={onProceed}
                loading={loading}
            >
                Create New Band
            </Button>
        );
    }

    return (
        <Modal
            title={mode === 'select-one' ? "Similar Bands Found" : "Select Bands to Merge"}
            open={open}
            onCancel={handleCancel}
            footer={footerButtons}
            width={600}
        >
            <div className="mb-4">
                {mode === 'select-one' ? (
                    <p>We found existing bands with similar names to &quot;{newBandName}&quot;. Please check if the band
                        already exists:</p>
                ) : (
                    <p>Select the bands that appear to be duplicates to merge them:</p>
                )}
            </div>

            <List
                dataSource={similarBands}
                renderItem={(band) => (
                    <List.Item
                        key={band.id}
                        actions={mode === 'select-one' ? [
                            <Button
                                key="select"
                                type="link"
                                onClick={() => onSelect(band)}
                                loading={loading}
                                disabled={loading}
                            >
                                Select
                            </Button>
                        ] : []}
                    >
                        {mode === 'select-multiple' && (
                            <Checkbox
                                checked={selectedBands.some(b => b.id === band.id)}
                                onChange={() => handleToggleBand(band)}
                            />
                        )}
                        <List.Item.Meta
                            title={band.name}
                            description={
                                <Space>
                                    <StatusTag
                                        verified={band.verified}
                                        approved={band.approved}
                                    />
                                    <Tag color="blue">
                                        Similarity: {band.similarity}
                                    </Tag>
                                </Space>
                            }
                        />
                    </List.Item>
                )}
            />
        </Modal>
    );
}
