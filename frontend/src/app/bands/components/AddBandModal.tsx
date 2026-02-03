'use client'

import {App} from 'antd';
import {useEffect, useRef, useState} from 'react';

import EntityModal from '@/components/common/modals/EntityModal';
import type {BaseFormRef} from '@/components/forms/BaseForm';
import {createBand, fetchBandById, fetchSimilarBands} from '@/lib/api/bands';
import type {BandResponse} from '@/types/api/bands';

import SimilarEntitiesModal from '@/components/common/modals/SimilarEntitiesModal';
import type {SimilarBand} from '@/lib/api/bands';

const bandFields = [
    {
        name: 'name',
        label: 'Name',
        required: true
    }
];

interface AddBandModalProps {
    open: boolean;
    onCancel: () => void;
    onSuccess: (band: BandResponse) => void;
}

export default function AddBandModal({open, onCancel, onSuccess}: AddBandModalProps) {
    const [showSimilarModal, setShowSimilarModal] = useState(false);
    const [similarBands, setSimilarBands] = useState<any[]>([]);
    const [pendingBandData, setPendingBandData] = useState<Partial<BandResponse> | null>(null);
    const [loading, setLoading] = useState(false);
    const {message} = App.useApp();
    const formRef = useRef<BaseFormRef>(null);

    // Reset form when modal closes
    useEffect(() => {
        if (!open && formRef.current?.form) {
            formRef.current.form.resetFields();
        }
    }, [open]);

    // Original submit handler that may return null
    const handleSubmitInternal = async (data: Partial<BandResponse>) => {
        try {
            // Check for similar bands first
            const similar = await fetchSimilarBands({search_term: data.name!});

            if (similar.length > 0) {
                setSimilarBands(similar);
                setPendingBandData(data);
                setShowSimilarModal(true);
                return null; // Prevent immediate creation
            }

            // No similar bands found, proceed with creation
            const result = await createBand(data);
            message.success('Band created successfully');
            onSuccess(result);
            return result;
        } catch (error) {
            console.error('Error in handleSubmit:', error);
            throw error;
        }
    };

    // Adapter function that ensures we always return a Promise<BandResponse>
    const handleSubmit = async (data: Partial<BandResponse>): Promise<BandResponse> => {
        const result = await handleSubmitInternal(data);
        if (result === null) {
            // If we're showing the similar bands modal, we need to throw an error
            // to prevent the form from being submitted and the modal from closing
            throw new Error('Similar bands found');
        }
        return result;
    };

    const handleSelectExisting = async (similarBand: { id: number }) => {
        try {
            setLoading(true);
            // Fetch complete band details
            const fullBand = await fetchBandById(similarBand.id);
            setShowSimilarModal(false);
            onSuccess(fullBand);
            // Reset form if ref exists
            if (formRef.current?.form) {
                formRef.current.form.resetFields();
            }
        } catch (error) {
            console.error('Error selecting existing band:', error);
            message.error('Failed to select existing band');
        } finally {
            setLoading(false);
        }
    };

    const handleProceedWithNew = async () => {
        if (!pendingBandData) return;

        try {
            setLoading(true);
            const result = await createBand(pendingBandData);
            message.success('Band created successfully');
            setShowSimilarModal(false);
            onSuccess(result);
            // Reset form if ref exists
            if (formRef.current?.form) {
                formRef.current.form.resetFields();
            }
        } catch (error) {
            console.error('Error creating band:', error);
            message.error('Failed to create band');
        } finally {
            setLoading(false);
        }
    };

    const handleModalCancel = () => {
        // Reset form if ref exists
        if (formRef.current?.form) {
            formRef.current.form.resetFields();
        }
        onCancel();
    };

    return (
        <>
            <EntityModal<BandResponse>
                title="Add Band"
                open={open}
                onCancel={handleModalCancel}
                onSuccess={onSuccess}
                fields={bandFields}
                onSubmit={handleSubmit}
                skipSuccessMessage={true} // Skip automatic success message
            />

            <SimilarEntitiesModal<SimilarBand>
                open={showSimilarModal}
                onCancel={() => setShowSimilarModal(false)}
                onSelect={handleSelectExisting}
                onProceed={handleProceedWithNew}
                similarEntities={similarBands}
                entityName="band"
                searchedName={pendingBandData?.name || ''}
                loading={loading}
            />
        </>
    );
}
