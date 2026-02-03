'use client'

import {App, Form, Input, Modal} from 'antd';
import {useState} from 'react';

import {createLabel, fetchSimilarLabels, type SimilarLabel} from '@/lib/api/labels';
import type {LabelResponse} from '@/types/api/labels';
import SimilarEntitiesModal, {type SearchSettings} from '@/components/common/modals/SimilarEntitiesModal';

interface AddLabelModalProps {
    open: boolean;
    onCancel: () => void;
    onSuccess: (label: LabelResponse) => void;
}

export default function AddLabelModal({open, onCancel, onSuccess}: AddLabelModalProps) {
    const [form] = Form.useForm();
    const {message} = App.useApp();
    const [loading, setLoading] = useState(false);
    const [similarLabels, setSimilarLabels] = useState<SimilarLabel[]>([]);
    const [isSimilarModalOpen, setIsSimilarModalOpen] = useState(false);
    const [pendingName, setPendingName] = useState('');
    const [searchSettings, setSearchSettings] = useState<SearchSettings>({
        jw_weight: 0.6,
        dice_weight: 0.4,
        min_similarity: 70,
        restrict_to_parent: false,
        limit: 20,
    });

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            const name = values.name.trim();
            setPendingName(name);
            setLoading(true);

            // Check for similar labels first
            const similar = await fetchSimilarLabels({
                search_term: name,
                jw_weight: searchSettings.jw_weight,
                dice_weight: searchSettings.dice_weight,
                min_similarity: searchSettings.min_similarity,
                limit: searchSettings.limit,
            });

            if (similar.length > 0) {
                setSimilarLabels(similar);
                setIsSimilarModalOpen(true);
                setLoading(false);
                return;
            }

            // No similar labels found, create directly
            await doCreate(name);
        } catch (error) {
            if (error && typeof error === 'object' && 'errorFields' in error) return;
            console.error('Error checking for similar labels:', error);
            message.error('Failed to check for similar labels');
            setLoading(false);
        }
    };

    const doCreate = async (name: string) => {
        try {
            setLoading(true);
            const label = await createLabel({name});
            message.success(`Label "${name}" created`);
            form.resetFields();
            setSimilarLabels([]);
            onSuccess(label);
        } catch (error) {
            console.error('Error creating label:', error);
            message.error('Failed to create label');
        } finally {
            setLoading(false);
        }
    };

    const handleProceedWithCreate = () => {
        setIsSimilarModalOpen(false);
        doCreate(pendingName);
    };

    const handleSelectSimilarLabel = (label: SimilarLabel) => {
        setIsSimilarModalOpen(false);
        message.info(`Selected existing label: ${label.name}`);
        onCancel();
    };

    const handleRerunSearch = async (settings: SearchSettings) => {
        setSearchSettings(settings);
        try {
            setLoading(true);
            const results = await fetchSimilarLabels({
                search_term: pendingName,
                jw_weight: settings.jw_weight,
                dice_weight: settings.dice_weight,
                min_similarity: settings.min_similarity,
                limit: settings.limit,
            });
            setSimilarLabels(results);
        } catch (error) {
            console.error('Error searching for similar labels:', error);
            message.error('Failed to search');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        form.resetFields();
        setSimilarLabels([]);
        setIsSimilarModalOpen(false);
        onCancel();
    };

    return (
        <>
            <Modal
                title="Add New Label"
                open={open && !isSimilarModalOpen}
                onOk={handleSubmit}
                onCancel={handleCancel}
                confirmLoading={loading}
                okText="Add Label"
            >
                <Form form={form} layout="vertical">
                    <Form.Item
                        name="name"
                        label="Label Name"
                        rules={[{required: true, message: 'Please enter a label name'}]}
                    >
                        <Input placeholder="Enter label name" autoFocus />
                    </Form.Item>
                </Form>
            </Modal>

            <SimilarEntitiesModal<SimilarLabel>
                open={isSimilarModalOpen}
                onCancel={() => setIsSimilarModalOpen(false)}
                onSelect={handleSelectSimilarLabel}
                onProceed={handleProceedWithCreate}
                onMergeSelected={() => {}}
                onRerunSearch={handleRerunSearch}
                similarEntities={similarLabels}
                entityName="label"
                searchedName={pendingName}
                loading={loading}
                mode="select-one"
                searchSettings={searchSettings}
            />
        </>
    );
}
