'use client'

import {
    Alert,
    Button,
    Card,
    Divider,
    Form,
    Input,
    Modal,
    Radio,
    Space,
    Spin,
    Steps,
    Tag,
    Typography,
} from 'antd';
import {useState} from 'react';

import {mergeStaff} from '@/lib/api/staff';
import type {StaffDetailView, MergeStaffRequest, StaffMergeResult} from '@/types/api/staff';
import {getStaffDisplayName} from '@/types/api/staff';

const {Text} = Typography;
const {TextArea} = Input;

interface StaffMergeComparisonModalProps {
    open: boolean;
    onCancel: () => void;
    staffMembers: StaffDetailView[];
    onMergeComplete: () => void;
}

export default function StaffMergeComparisonModal({
    open,
    onCancel,
    staffMembers,
    onMergeComplete,
}: StaffMergeComparisonModalProps) {
    const [form] = Form.useForm();
    const [currentStep, setCurrentStep] = useState(0);
    const [targetId, setTargetId] = useState<number | null>(
        staffMembers.length > 0 ? staffMembers[0].id : null
    );
    const [merging, setMerging] = useState(false);
    const [mergeResult, setMergeResult] = useState<StaffMergeResult | null>(null);

    if (staffMembers.length === 0) {
        return null;
    }

    const sourceStaff = staffMembers.filter((s) => s.id !== targetId);
    const targetStaff = staffMembers.find((s) => s.id === targetId);

    const handleTargetChange = (id: number) => {
        setTargetId(id);
    };

    const handleMerge = async () => {
        if (!targetId || !targetStaff) return;

        try {
            setMerging(true);
            const formValues = await form.validateFields();

            const request: MergeStaffRequest = {
                from_ids: sourceStaff.map((s) => s.id),
                into_id: targetId,
                merged_data: {
                    first_name: formValues.first_name,
                    last_name: formValues.last_name,
                    on_air_name: formValues.on_air_name,
                    email: formValues.email,
                    position: formValues.position,
                    bio: formValues.bio,
                    show_name: formValues.show_name,
                    show_description: formValues.show_description,
                },
            };

            const result = await mergeStaff(request);
            setMergeResult(result);
            setCurrentStep(2);
        } catch (error) {
            console.error('Error merging staff:', error);
        } finally {
            setMerging(false);
        }
    };

    const renderFieldComparison = (
        fieldName: string,
        label: string,
        isTextArea = false
    ) => {
        const values = staffMembers.map((s) => ({
            id: s.id,
            name: getStaffDisplayName(s),
            value: (s as any)[fieldName] || '',
        }));

        const nonEmptyValues = values.filter((v) => v.value);

        return (
            <Form.Item name={fieldName} label={label}>
                {nonEmptyValues.length === 0 ? (
                    isTextArea ? (
                        <TextArea rows={3} placeholder={`Enter ${label.toLowerCase()}`}/>
                    ) : (
                        <Input placeholder={`Enter ${label.toLowerCase()}`}/>
                    )
                ) : nonEmptyValues.length === 1 ? (
                    isTextArea ? (
                        <TextArea rows={3} defaultValue={nonEmptyValues[0].value}/>
                    ) : (
                        <Input defaultValue={nonEmptyValues[0].value}/>
                    )
                ) : (
                    <Space direction="vertical" className="w-full">
                        <Radio.Group
                            onChange={(e) => form.setFieldValue(fieldName, e.target.value)}
                            className="w-full"
                        >
                            {nonEmptyValues.map((v) => (
                                <Radio key={v.id} value={v.value} className="block mb-2">
                                    <Space>
                                        <Tag color={v.id === targetId ? 'green' : 'blue'}>
                                            {v.name}
                                        </Tag>
                                        <Text>{v.value.substring(0, 100)}{v.value.length > 100 ? '...' : ''}</Text>
                                    </Space>
                                </Radio>
                            ))}
                        </Radio.Group>
                        {isTextArea ? (
                            <TextArea rows={3} placeholder="Or enter custom value"/>
                        ) : (
                            <Input placeholder="Or enter custom value"/>
                        )}
                    </Space>
                )}
            </Form.Item>
        );
    };

    const steps = [
        {
            title: 'Select Target',
            content: (
                <div>
                    <Alert
                        message="Select Target Profile"
                        description="Choose which profile will be kept. All other profiles will be merged into this one and deleted."
                        type="info"
                        showIcon
                        className="mb-4"
                    />
                    <Radio.Group
                        value={targetId}
                        onChange={(e) => handleTargetChange(e.target.value)}
                        className="w-full"
                    >
                        <Space direction="vertical" className="w-full">
                            {staffMembers.map((staff) => (
                                <Card
                                    key={staff.id}
                                    size="small"
                                    className={`cursor-pointer ${
                                        staff.id === targetId ? 'border-blue-500 border-2' : ''
                                    }`}
                                    onClick={() => handleTargetChange(staff.id)}
                                >
                                    <Radio value={staff.id}>
                                        <Space>
                                            <Text strong>{getStaffDisplayName(staff)}</Text>
                                            {staff.verified === 1 && (
                                                <Tag color="green">Verified</Tag>
                                            )}
                                            {staff.approved === 1 && (
                                                <Tag color="blue">Approved</Tag>
                                            )}
                                            {staff.images && staff.images.length > 0 && (
                                                <Tag>{staff.images.length} images</Tag>
                                            )}
                                        </Space>
                                    </Radio>
                                </Card>
                            ))}
                        </Space>
                    </Radio.Group>
                </div>
            ),
        },
        {
            title: 'Merge Fields',
            content: (
                <div>
                    <Alert
                        message="Select Field Values"
                        description="Choose which values to keep for each field. You can also enter custom values."
                        type="info"
                        showIcon
                        className="mb-4"
                    />
                    <Form
                        form={form}
                        layout="vertical"
                        initialValues={{
                            first_name: targetStaff?.first_name || '',
                            last_name: targetStaff?.last_name || '',
                            on_air_name: targetStaff?.on_air_name || '',
                            email: targetStaff?.email || '',
                            position: targetStaff?.position || '',
                            bio: targetStaff?.bio || '',
                            show_name: targetStaff?.show_name || '',
                            show_description: targetStaff?.show_description || '',
                        }}
                    >
                        {renderFieldComparison('first_name', 'First Name')}
                        {renderFieldComparison('last_name', 'Last Name')}
                        {renderFieldComparison('on_air_name', 'On-Air Name')}
                        {renderFieldComparison('email', 'Email')}
                        {renderFieldComparison('position', 'Position')}
                        {renderFieldComparison('show_name', 'Show Name')}
                        {renderFieldComparison('bio', 'Bio', true)}
                        {renderFieldComparison('show_description', 'Show Description', true)}
                    </Form>
                </div>
            ),
        },
        {
            title: 'Complete',
            content: mergeResult ? (
                <div>
                    <Alert
                        message="Merge Completed Successfully"
                        description={`Staff members have been merged into "${getStaffDisplayName(
                            mergeResult.merged_staff as any
                        )}".`}
                        type="success"
                        showIcon
                        className="mb-4"
                    />
                    <Card title="Merge Statistics" size="small">
                        <Space direction="vertical" className="w-full">
                            <div className="flex justify-between">
                                <Text>Images Moved:</Text>
                                <Text strong>{mergeResult.stats.images_moved}</Text>
                            </div>
                            <div className="flex justify-between">
                                <Text>Images Deduplicated:</Text>
                                <Text strong>{mergeResult.stats.images_deduped}</Text>
                            </div>
                            <div className="flex justify-between">
                                <Text>Links Moved:</Text>
                                <Text strong>{mergeResult.stats.links_moved}</Text>
                            </div>
                            <div className="flex justify-between">
                                <Text>Phone Numbers Moved:</Text>
                                <Text strong>{mergeResult.stats.phones_moved}</Text>
                            </div>
                            <div className="flex justify-between">
                                <Text>Addresses Moved:</Text>
                                <Text strong>{mergeResult.stats.addresses_moved}</Text>
                            </div>
                            <div className="flex justify-between">
                                <Text>Playlists Moved:</Text>
                                <Text strong>{mergeResult.stats.playlists_moved}</Text>
                            </div>
                            <div className="flex justify-between">
                                <Text>Playlists Aggregated:</Text>
                                <Text strong>{mergeResult.stats.playlists_aggregated}</Text>
                            </div>
                            <div className="flex justify-between">
                                <Text>Archives Moved:</Text>
                                <Text strong>{mergeResult.stats.playlist_archives_moved}</Text>
                            </div>
                            <div className="flex justify-between">
                                <Text>Sub-Genres Calculated:</Text>
                                <Text strong>{mergeResult.stats.sub_genres_calculated}</Text>
                            </div>
                            <Divider className="my-2"/>
                            <div className="flex justify-between">
                                <Text>Profiles Deleted:</Text>
                                <Text strong type="danger">
                                    {mergeResult.stats.staff_deleted}
                                </Text>
                            </div>
                        </Space>
                    </Card>
                </div>
            ) : (
                <Spin/>
            ),
        },
    ];

    const handleNext = () => {
        if (currentStep === 1) {
            handleMerge();
        } else {
            setCurrentStep(currentStep + 1);
        }
    };

    const handlePrev = () => {
        setCurrentStep(currentStep - 1);
    };

    const handleDone = () => {
        onMergeComplete();
    };

    return (
        <Modal
            title="Merge Staff Members"
            open={open}
            onCancel={onCancel}
            width={800}
            footer={
                <Space>
                    <Button onClick={onCancel}>Cancel</Button>
                    {currentStep > 0 && currentStep < 2 && (
                        <Button onClick={handlePrev}>Previous</Button>
                    )}
                    {currentStep < 2 && (
                        <Button
                            type="primary"
                            onClick={handleNext}
                            loading={merging}
                            disabled={!targetId}
                        >
                            {currentStep === 1 ? 'Merge' : 'Next'}
                        </Button>
                    )}
                    {currentStep === 2 && (
                        <Button type="primary" onClick={handleDone}>
                            Done
                        </Button>
                    )}
                </Space>
            }
        >
            <Steps
                current={currentStep}
                items={steps.map((s) => ({title: s.title}))}
                className="mb-6"
            />
            <div className="min-h-[400px]">{steps[currentStep].content}</div>
        </Modal>
    );
}
