'use client'

import {
    DeleteOutlined,
    EnvironmentOutlined,
    InfoCircleOutlined,
    LinkOutlined,
    MailOutlined,
    PhoneOutlined,
    PictureOutlined,
    PlusOutlined,
    ReloadOutlined,
    SaveOutlined,
    SettingOutlined,
    SwapOutlined,
    TagOutlined,
    UnlockOutlined,
    WarningOutlined,
} from '@ant-design/icons';
import {
    Alert,
    App,
    Button,
    Card,
    Col,
    Divider,
    Form,
    Input,
    Modal,
    Row,
    Select,
    Space,
    Tabs,
    Tag,
    Typography,
} from 'antd';
import Link from 'next/link';
import {useEffect, useState} from 'react';

import LoadingSpinner from '@/components/common/feedback/LoadingSpinner';
import {BaseFormField} from '@/components/common/forms/BaseFormField';
import {EmailInput} from '@/components/common/forms/fields/EmailInput';
import {RichTextInput} from '@/components/common/forms/fields/RichTextInput';
import {TextInput} from '@/components/common/forms/fields/TextInput';
import CityTypeahead from '@/components/common/typeahead/CityTypeahead';
import CountryTypeahead from '@/components/common/typeahead/CountryTypeahead';
import StateTypeahead from '@/components/common/typeahead/StateTypeahead';
import {
    archiveStaff,
    fetchStaffById,
    recalculateStaffSubGenres,
    unarchiveStaff,
    updateStaff,
} from '@/lib/api/staff';
import {buildImageUrl} from '@/lib/utils/media';
import type {CityResponse, CountryResponse, StateResponse} from '@/types/api/locations';
import type {StaffAddressResponse, StaffDetailView, StaffLinkResponse, StaffPhoneResponse} from '@/types/api/staff';
import {getStaffDisplayName, isStaffArchived, isStaffTransferSource} from '@/types/api/staff';

const {Text} = Typography;
const {TextArea} = Input;

interface StaffFormValues {
    first_name?: string;
    last_name?: string;
    on_air_name?: string;
    position?: string;
    email?: string;
    bio?: string;
    show_name?: string;
    show_description?: string;
    start_time?: string;
    end_time?: string;
    days_on?: string;
}

interface StaffEditContentProps {
    id: string;
    slug: string;
}

export default function StaffEditContent({id}: StaffEditContentProps) {
    const [staff, setStaff] = useState<StaffDetailView | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [recalculating, setRecalculating] = useState(false);
    const {message} = App.useApp();
    const [form] = Form.useForm();

    // Archive modal state
    const [archiveModalVisible, setArchiveModalVisible] = useState(false);
    const [archiveReason, setArchiveReason] = useState('');
    const [archiving, setArchiving] = useState(false);

    // Related data state
    const [phones, setPhones] = useState<StaffPhoneResponse[]>([]);
    const [links, setLinks] = useState<StaffLinkResponse[]>([]);
    const [addresses, setAddresses] = useState<StaffAddressResponse[]>([]);

    // Address location state
    const [addressLocations, setAddressLocations] = useState<{
        [key: number]: {
            country?: CountryResponse;
            state?: StateResponse;
            city?: CityResponse;
        };
    }>({});

    useEffect(() => {
        const loadStaff = async () => {
            try {
                setLoading(true);
                const data = await fetchStaffById(parseInt(id), {
                    include_images: true,
                    include_addresses: true,
                    include_links: true,
                    include_phones: true,
                    include_sub_genres: true,
                });
                setStaff(data);

                // Set initial form values
                form.setFieldsValue({
                    first_name: data.first_name || '',
                    last_name: data.last_name || '',
                    on_air_name: data.on_air_name || '',
                    position: data.position || '',
                    email: data.email || '',
                    bio: data.bio || '',
                    show_name: data.show_name || '',
                    show_description: data.show_description || '',
                    start_time: data.start_time || '',
                    end_time: data.end_time || '',
                    days_on: data.days_on || '',
                });

                // Set related data
                setPhones(data.phone_numbers || []);
                setLinks(data.links || []);
                setAddresses(data.addresses || []);
            } catch (err) {
                console.error('Error loading staff member:', err);
                message.error('Failed to load staff member details');
            } finally {
                setLoading(false);
            }
        };

        loadStaff();
    }, [id, message, form]);

    const handleSave = async (values: StaffFormValues) => {
        if (!staff) return;

        try {
            setSaving(true);
            await updateStaff(staff.id, values);
            message.success('Staff member updated successfully');
        } catch (err) {
            console.error('Error updating staff member:', err);
            message.error('Failed to update staff member');
        } finally {
            setSaving(false);
        }
    };

    const handleRecalculateSubGenres = async () => {
        if (!staff) return;

        try {
            setRecalculating(true);
            const newSubGenreIds = await recalculateStaffSubGenres(staff.id);
            message.success(`Sub-genres recalculated. ${newSubGenreIds.length} sub-genres assigned.`);

            // Reload staff to get updated sub-genres
            const data = await fetchStaffById(staff.id, {include_sub_genres: true});
            setStaff(prev => prev ? {...prev, sub_genres: data.sub_genres} : null);
        } catch (err) {
            console.error('Error recalculating sub-genres:', err);
            message.error('Failed to recalculate sub-genres');
        } finally {
            setRecalculating(false);
        }
    };

    const handleArchive = async () => {
        if (!staff || !archiveReason.trim()) {
            message.error('Please provide a reason for archiving');
            return;
        }

        try {
            setArchiving(true);
            await archiveStaff(staff.id, archiveReason);
            message.success('Staff member archived successfully');
            setArchiveModalVisible(false);

            // Reload staff to get updated status
            const data = await fetchStaffById(staff.id);
            setStaff(data);
        } catch (err) {
            console.error('Error archiving staff member:', err);
            message.error('Failed to archive staff member');
        } finally {
            setArchiving(false);
        }
    };

    const handleUnarchive = async () => {
        if (!staff) return;

        try {
            setSaving(true);
            await unarchiveStaff(staff.id);
            message.success('Staff member unarchived successfully');

            // Reload staff to get updated status
            const data = await fetchStaffById(staff.id);
            setStaff(data);
        } catch (err) {
            console.error('Error unarchiving staff member:', err);
            message.error('Failed to unarchive staff member');
        } finally {
            setSaving(false);
        }
    };

    // Phone handlers
    const handleAddPhone = () => {
        const newPhone: StaffPhoneResponse = {
            id: -Date.now(), // Temporary negative ID for new items
            staff_member_id: staff?.id || null,
            phone: '',
            ext: null,
            type: null,
            created: null,
            modified: null,
        };
        setPhones([...phones, newPhone]);
    };

    const handleRemovePhone = (index: number) => {
        setPhones(phones.filter((_, i) => i !== index));
    };

    const handlePhoneChange = (index: number, field: keyof StaffPhoneResponse, value: any) => {
        const updated = [...phones];
        (updated[index] as any)[field] = value;
        setPhones(updated);
    };

    // Link handlers
    const handleAddLink = () => {
        const newLink: StaffLinkResponse = {
            id: -Date.now(),
            staff_member_id: staff?.id || null,
            link: '',
            type: null,
            created: null,
            modified: null,
        };
        setLinks([...links, newLink]);
    };

    const handleRemoveLink = (index: number) => {
        setLinks(links.filter((_, i) => i !== index));
    };

    const handleLinkChange = (index: number, field: keyof StaffLinkResponse, value: any) => {
        const updated = [...links];
        (updated[index] as any)[field] = value;
        setLinks(updated);
    };

    // Address handlers
    const handleAddAddress = () => {
        const newAddress: StaffAddressResponse = {
            id: -Date.now(),
            staff_member_id: staff?.id || null,
            address: '',
            address2: null,
            city_id: null,
            state_id: null,
            country_id: null,
            postal_code_id: null,
            type: null,
            created: null,
            modified: null,
        };
        setAddresses([...addresses, newAddress]);
    };

    const handleRemoveAddress = (index: number) => {
        setAddresses(addresses.filter((_, i) => i !== index));
    };

    const handleAddressChange = (index: number, field: keyof StaffAddressResponse, value: any) => {
        const updated = [...addresses];
        (updated[index] as any)[field] = value;
        setAddresses(updated);
    };

    const handleAddressLocationChange = (
        addressId: number,
        type: 'country' | 'state' | 'city',
        value: CountryResponse | StateResponse | CityResponse | undefined
    ) => {
        setAddressLocations(prev => ({
            ...prev,
            [addressId]: {
                ...prev[addressId],
                [type]: value,
            },
        }));
    };

    if (loading) {
        return <LoadingSpinner className="min-h-screen"/>;
    }

    if (!staff) {
        return (
            <Card className="m-6">
                <div className="text-center text-red-500">
                    Staff member not found
                </div>
            </Card>
        );
    }

    const displayName = getStaffDisplayName(staff);
    const isArchived = isStaffArchived(staff);
    const isTransferSource = isStaffTransferSource(staff);

    const items = [
        {
            key: 'basic',
            label: (
                <span className="flex items-center gap-1">
                    <InfoCircleOutlined/>
                    <span>Basic Info</span>
                </span>
            ),
            children: (
                <div className="space-y-6">
                    <Card title="Personal Information">
                        <Row gutter={16}>
                            <Col xs={24} md={12}>
                                <TextInput
                                    name="first_name"
                                    label="First Name"
                                />
                            </Col>
                            <Col xs={24} md={12}>
                                <TextInput
                                    name="last_name"
                                    label="Last Name"
                                />
                            </Col>
                        </Row>
                        <Row gutter={16}>
                            <Col xs={24} md={12}>
                                <TextInput
                                    name="on_air_name"
                                    label="On-Air Name"
                                />
                            </Col>
                            <Col xs={24} md={12}>
                                <TextInput
                                    name="position"
                                    label="Position"
                                />
                            </Col>
                        </Row>
                        <BaseFormField
                            name="bio"
                            label="Biography"
                        >
                            <RichTextInput rows={6}/>
                        </BaseFormField>
                    </Card>

                    <Card title="Show Information">
                        <TextInput
                            name="show_name"
                            label="Show Name"
                        />
                        <BaseFormField
                            name="show_description"
                            label="Show Description"
                        >
                            <RichTextInput rows={4}/>
                        </BaseFormField>
                        <Row gutter={16}>
                            <Col xs={24} md={8}>
                                <TextInput
                                    name="days_on"
                                    label="Days On Air"
                                />
                            </Col>
                            <Col xs={24} md={8}>
                                <TextInput
                                    name="start_time"
                                    label="Start Time"
                                />
                            </Col>
                            <Col xs={24} md={8}>
                                <TextInput
                                    name="end_time"
                                    label="End Time"
                                />
                            </Col>
                        </Row>
                    </Card>

                    {/* Station Info (Read-only) */}
                    <Card title="Station (Read-only)">
                        {staff.station ? (
                            <Space>
                                <Text strong>{staff.station.name}</Text>
                                {staff.station.call_letters && (
                                    <Tag>{staff.station.call_letters}</Tag>
                                )}
                            </Space>
                        ) : (
                            <Text type="secondary" italic>No station assigned</Text>
                        )}
                        <div className="mt-2 text-sm text-gray-500">
                            To change station, use the Transfer feature in the Admin tab.
                        </div>
                    </Card>
                </div>
            )
        },
        {
            key: 'contact',
            label: (
                <span className="flex items-center gap-1">
                    <MailOutlined/>
                    <span>Contact</span>
                </span>
            ),
            children: (
                <div className="space-y-6">
                    <Card title="Email">
                        <EmailInput
                            name="email"
                            label="Email Address"
                        />
                    </Card>

                    <Card
                        title="Phone Numbers"
                        extra={
                            <Button
                                type="dashed"
                                icon={<PlusOutlined/>}
                                onClick={handleAddPhone}
                            >
                                Add Phone
                            </Button>
                        }
                    >
                        {phones.length > 0 ? (
                            <div className="space-y-4">
                                {phones.map((phone, index) => (
                                    <div key={phone.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                                        <PhoneOutlined className="mt-2 text-gray-400"/>
                                        <div className="flex-1">
                                            <Row gutter={12}>
                                                <Col xs={24} md={10}>
                                                    <Input
                                                        placeholder="Phone number"
                                                        value={phone.phone || ''}
                                                        onChange={(e) => handlePhoneChange(index, 'phone', e.target.value)}
                                                    />
                                                </Col>
                                                <Col xs={12} md={6}>
                                                    <Input
                                                        placeholder="Extension"
                                                        value={phone.ext?.toString() || ''}
                                                        onChange={(e) => handlePhoneChange(index, 'ext', e.target.value ? parseInt(e.target.value) : null)}
                                                    />
                                                </Col>
                                                <Col xs={12} md={6}>
                                                    <Select
                                                        placeholder="Type"
                                                        value={phone.type || undefined}
                                                        onChange={(value) => handlePhoneChange(index, 'type', value)}
                                                        options={[
                                                            {label: 'Work', value: 'work'},
                                                            {label: 'Mobile', value: 'mobile'},
                                                            {label: 'Home', value: 'home'},
                                                            {label: 'Fax', value: 'fax'},
                                                        ]}
                                                        allowClear
                                                        className="w-full"
                                                    />
                                                </Col>
                                                <Col xs={24} md={2}>
                                                    <Button
                                                        type="text"
                                                        danger
                                                        icon={<DeleteOutlined/>}
                                                        onClick={() => handleRemovePhone(index)}
                                                    />
                                                </Col>
                                            </Row>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <Text type="secondary" italic>No phone numbers added</Text>
                        )}
                    </Card>

                    <Card
                        title="Links"
                        extra={
                            <Button
                                type="dashed"
                                icon={<PlusOutlined/>}
                                onClick={handleAddLink}
                            >
                                Add Link
                            </Button>
                        }
                    >
                        {links.length > 0 ? (
                            <div className="space-y-4">
                                {links.map((link, index) => (
                                    <div key={link.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                                        <LinkOutlined className="mt-2 text-gray-400"/>
                                        <div className="flex-1">
                                            <Row gutter={12}>
                                                <Col xs={24} md={14}>
                                                    <Input
                                                        placeholder="URL"
                                                        value={link.link || ''}
                                                        onChange={(e) => handleLinkChange(index, 'link', e.target.value)}
                                                    />
                                                </Col>
                                                <Col xs={20} md={8}>
                                                    <Select
                                                        placeholder="Type"
                                                        value={link.type || undefined}
                                                        onChange={(value) => handleLinkChange(index, 'type', value)}
                                                        options={[
                                                            {label: 'Website', value: 'website'},
                                                            {label: 'Facebook', value: 'facebook'},
                                                            {label: 'Twitter', value: 'twitter'},
                                                            {label: 'Instagram', value: 'instagram'},
                                                            {label: 'YouTube', value: 'youtube'},
                                                            {label: 'Spotify', value: 'spotify'},
                                                            {label: 'Other', value: 'other'},
                                                        ]}
                                                        allowClear
                                                        className="w-full"
                                                    />
                                                </Col>
                                                <Col xs={4} md={2}>
                                                    <Button
                                                        type="text"
                                                        danger
                                                        icon={<DeleteOutlined/>}
                                                        onClick={() => handleRemoveLink(index)}
                                                    />
                                                </Col>
                                            </Row>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <Text type="secondary" italic>No links added</Text>
                        )}
                    </Card>
                </div>
            )
        },
        {
            key: 'addresses',
            label: (
                <span className="flex items-center gap-1">
                    <EnvironmentOutlined/>
                    <span>Addresses</span>
                </span>
            ),
            children: (
                <div className="space-y-6">
                    <Card
                        title="Addresses"
                        extra={
                            <Button
                                type="dashed"
                                icon={<PlusOutlined/>}
                                onClick={handleAddAddress}
                            >
                                Add Address
                            </Button>
                        }
                    >
                        {addresses.length > 0 ? (
                            <div className="space-y-6">
                                {addresses.map((address, index) => {
                                    const loc = addressLocations[address.id] || {};
                                    return (
                                        <Card
                                            key={address.id}
                                            size="small"
                                            title={`Address ${index + 1}`}
                                            extra={
                                                <Button
                                                    type="text"
                                                    danger
                                                    icon={<DeleteOutlined/>}
                                                    onClick={() => handleRemoveAddress(index)}
                                                />
                                            }
                                        >
                                            <Row gutter={16}>
                                                <Col xs={24}>
                                                    <Form.Item label="Address Line 1">
                                                        <Input
                                                            value={address.address || ''}
                                                            onChange={(e) => handleAddressChange(index, 'address', e.target.value)}
                                                        />
                                                    </Form.Item>
                                                </Col>
                                                <Col xs={24}>
                                                    <Form.Item label="Address Line 2">
                                                        <Input
                                                            value={address.address2 || ''}
                                                            onChange={(e) => handleAddressChange(index, 'address2', e.target.value)}
                                                        />
                                                    </Form.Item>
                                                </Col>
                                                <Col xs={24} md={8}>
                                                    <Form.Item label="Country">
                                                        <CountryTypeahead
                                                            value={loc.country?.id || address.country_id || undefined}
                                                            onChange={(value, country) => {
                                                                handleAddressChange(index, 'country_id', value || null);
                                                                handleAddressLocationChange(address.id, 'country', country);
                                                                // Clear state and city when country changes
                                                                handleAddressChange(index, 'state_id', null);
                                                                handleAddressChange(index, 'city_id', null);
                                                                handleAddressLocationChange(address.id, 'state', undefined);
                                                                handleAddressLocationChange(address.id, 'city', undefined);
                                                            }}
                                                            onClear={() => {
                                                                handleAddressChange(index, 'country_id', null);
                                                                handleAddressLocationChange(address.id, 'country', undefined);
                                                            }}
                                                        />
                                                    </Form.Item>
                                                </Col>
                                                <Col xs={24} md={8}>
                                                    <Form.Item label="State/Province">
                                                        <StateTypeahead
                                                            value={loc.state?.id || address.state_id || undefined}
                                                            countryId={loc.country?.id || address.country_id || undefined}
                                                            onChange={(value, state) => {
                                                                handleAddressChange(index, 'state_id', value || null);
                                                                handleAddressLocationChange(address.id, 'state', state);
                                                                // Clear city when state changes
                                                                handleAddressChange(index, 'city_id', null);
                                                                handleAddressLocationChange(address.id, 'city', undefined);
                                                            }}
                                                            onClear={() => {
                                                                handleAddressChange(index, 'state_id', null);
                                                                handleAddressLocationChange(address.id, 'state', undefined);
                                                            }}
                                                        />
                                                    </Form.Item>
                                                </Col>
                                                <Col xs={24} md={8}>
                                                    <Form.Item label="City">
                                                        <CityTypeahead
                                                            value={loc.city?.id || address.city_id || undefined}
                                                            countryId={loc.country?.id || address.country_id || undefined}
                                                            stateId={loc.state?.id || address.state_id || undefined}
                                                            onChange={(value, city) => {
                                                                handleAddressChange(index, 'city_id', value || null);
                                                                handleAddressLocationChange(address.id, 'city', city);
                                                            }}
                                                            onClear={() => {
                                                                handleAddressChange(index, 'city_id', null);
                                                                handleAddressLocationChange(address.id, 'city', undefined);
                                                            }}
                                                        />
                                                    </Form.Item>
                                                </Col>
                                                <Col xs={24} md={8}>
                                                    <Form.Item label="Type">
                                                        <Select
                                                            value={address.type || undefined}
                                                            onChange={(value) => handleAddressChange(index, 'type', value)}
                                                            options={[
                                                                {label: 'Work', value: 'work'},
                                                                {label: 'Home', value: 'home'},
                                                                {label: 'Mailing', value: 'mailing'},
                                                            ]}
                                                            allowClear
                                                            placeholder="Select type"
                                                        />
                                                    </Form.Item>
                                                </Col>
                                            </Row>
                                        </Card>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <Text type="secondary" italic>No addresses added</Text>
                            </div>
                        )}
                    </Card>
                </div>
            )
        },
        {
            key: 'media',
            label: (
                <span className="flex items-center gap-1">
                    <PictureOutlined/>
                    <span>Media</span>
                </span>
            ),
            children: (
                <div className="space-y-6">
                    <Card title="Images">
                        <Alert
                            message="Image Management Coming Soon"
                            description="The image management feature for staff members will be available in a future update. You can view existing images on the View page."
                            type="info"
                            showIcon
                            className="mb-4"
                        />
                        {staff.images && staff.images.length > 0 ? (
                            <Row gutter={[16, 16]}>
                                {staff.images.map((image) => {
                                    const imageUrl = image.thumbname
                                        ? buildImageUrl(image.path, image.thumbname)
                                        : null;
                                    if (!imageUrl) return null;
                                    return (
                                        <Col key={image.id} xs={12} sm={8} md={6}>
                                            <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                                                <img
                                                    src={imageUrl}
                                                    alt="Staff image"
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        </Col>
                                    );
                                })}
                            </Row>
                        ) : (
                            <Text type="secondary" italic>No images uploaded</Text>
                        )}
                    </Card>
                </div>
            )
        },
        {
            key: 'subgenres',
            label: (
                <span className="flex items-center gap-1">
                    <TagOutlined/>
                    <span>Sub-Genres</span>
                </span>
            ),
            children: (
                <div className="space-y-6">
                    <Card
                        title="Sub-Genres (Calculated)"
                        extra={
                            <Button
                                icon={<ReloadOutlined spin={recalculating}/>}
                                onClick={handleRecalculateSubGenres}
                                loading={recalculating}
                            >
                                Recalculate
                            </Button>
                        }
                    >
                        <Alert
                            message="Sub-genres are calculated automatically"
                            description="Sub-genres are assigned based on playlist archives. A sub-genre is assigned when the staff member has played 5+ unique songs from 5+ unique bands in that sub-genre."
                            type="info"
                            showIcon
                            className="mb-4"
                        />
                        <Space wrap>
                            {staff.sub_genres && staff.sub_genres.length > 0 ? (
                                staff.sub_genres.map(subGenre => (
                                    <Tag key={subGenre.id} color="purple" className="text-base py-1 px-3">
                                        {subGenre.name}
                                    </Tag>
                                ))
                            ) : (
                                <Text type="secondary" italic>
                                    No sub-genres calculated. Click &ldquo;Recalculate&rdquo; to update based on playlist history.
                                </Text>
                            )}
                        </Space>
                    </Card>
                </div>
            )
        },
        {
            key: 'admin',
            label: (
                <span className="flex items-center gap-1">
                    <SettingOutlined/>
                    <span>Admin</span>
                </span>
            ),
            children: (
                <div className="space-y-6">
                    {/* Status Flags */}
                    <Card title="Status Flags">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Text strong>Verified</Text>
                                    <div className="text-sm text-gray-500">Mark this staff member as verified</div>
                                </div>
                                <Tag color={staff.verified ? 'success' : 'default'}>
                                    {staff.verified ? 'Yes' : 'No'}
                                </Tag>
                            </div>
                            <Divider className="my-2"/>
                            <div className="flex items-center justify-between">
                                <div>
                                    <Text strong>Approved</Text>
                                    <div className="text-sm text-gray-500">Mark this staff member as approved</div>
                                </div>
                                <Tag color={staff.approved ? 'success' : 'default'}>
                                    {staff.approved ? 'Yes' : 'No'}
                                </Tag>
                            </div>
                            <Divider className="my-2"/>
                            <div className="flex items-center justify-between">
                                <div>
                                    <Text strong>Has Playlist</Text>
                                    <div className="text-sm text-gray-500">Whether this staff member reports playlists</div>
                                </div>
                                <Tag color={staff.has_playlist ? 'success' : 'default'}>
                                    {staff.has_playlist ? 'Yes' : 'No'}
                                </Tag>
                            </div>
                        </div>
                    </Card>

                    {/* Archive Section */}
                    <Card title="Archive Management">
                        {isArchived ? (
                            <div>
                                <Alert
                                    type="warning"
                                    showIcon
                                    icon={<WarningOutlined/>}
                                    message="This profile is archived"
                                    description={
                                        <>
                                            {staff.archived_at && (
                                                <div>Archived on: {new Date(staff.archived_at).toLocaleDateString()}</div>
                                            )}
                                            {staff.archived_reason && (
                                                <div>Reason: {staff.archived_reason}</div>
                                            )}
                                        </>
                                    }
                                    className="mb-4"
                                />
                                {isTransferSource && staff.transferred_to && (
                                    <Alert
                                        type="info"
                                        showIcon
                                        icon={<SwapOutlined/>}
                                        message="Transferred Profile"
                                        description={
                                            <Link href={`/staff/view/${staff.transferred_to.id}/${staff.slug}`}>
                                                View current profile at {staff.transferred_to.station_name || 'new station'}
                                            </Link>
                                        }
                                        className="mb-4"
                                    />
                                )}
                                <Button
                                    type="primary"
                                    icon={<UnlockOutlined/>}
                                    onClick={handleUnarchive}
                                    loading={saving}
                                >
                                    Unarchive Profile
                                </Button>
                            </div>
                        ) : (
                            <div>
                                <Alert
                                    type="info"
                                    message="Archive this profile"
                                    description="Archiving will hide this profile from regular searches. Use this for staff members who have left or been merged into another profile."
                                    className="mb-4"
                                />
                                <Button
                                    danger
                                    icon={<WarningOutlined/>}
                                    onClick={() => setArchiveModalVisible(true)}
                                >
                                    Archive Profile
                                </Button>
                            </div>
                        )}
                    </Card>

                    {/* Transfer Section */}
                    {!isArchived && (
                        <Card title="Station Transfer">
                            <Alert
                                type="info"
                                message="Transfer to another station"
                                description="Transfer creates a new profile at the target station and archives this one. The new profile will have copies of images, links, and phone numbers, but playlists stay with this profile."
                                className="mb-4"
                            />
                            <Button
                                icon={<SwapOutlined/>}
                                onClick={() => message.info('Transfer feature coming soon')}
                            >
                                Transfer to Another Station
                            </Button>
                        </Card>
                    )}
                </div>
            )
        }
    ];

    return (
        <div className="max-w-7xl mx-auto">
            {/* Archived Banner */}
            {isArchived && (
                <Alert
                    type="warning"
                    showIcon
                    message="Archived Profile"
                    description={
                        <>
                            This profile is archived. Editing is limited.
                            {isTransferSource && staff.transferred_to && (
                                <>
                                    {' '}
                                    <Link href={`/staff/view/${staff.transferred_to.id}/${staff.slug}`}>
                                        View current profile
                                    </Link>
                                </>
                            )}
                        </>
                    }
                    className="mb-6"
                />
            )}

            <Form
                form={form}
                layout="vertical"
                onFinish={handleSave}
                className="staff-edit-form"
                preserve={false}
            >
                <Card
                    title={`Editing: ${displayName}`}
                    extra={
                        <Space>
                            <Button
                                type="primary"
                                icon={<SaveOutlined/>}
                                onClick={() => form.submit()}
                                loading={saving}
                                disabled={isArchived && !staff.admin_editable}
                            >
                                Save Changes
                            </Button>
                        </Space>
                    }
                >
                    <Tabs
                        defaultActiveKey="basic"
                        items={items}
                        size="large"
                        destroyInactiveTabPane={false}
                    />
                </Card>
            </Form>

            {/* Archive Modal */}
            <Modal
                title="Archive Staff Member"
                open={archiveModalVisible}
                onCancel={() => setArchiveModalVisible(false)}
                onOk={handleArchive}
                confirmLoading={archiving}
                okText="Archive"
                okButtonProps={{danger: true}}
            >
                <div className="space-y-4">
                    <Alert
                        type="warning"
                        message="This action will hide this profile from regular searches."
                        showIcon
                    />
                    <div>
                        <Text strong>Reason for archiving:</Text>
                        <TextArea
                            rows={3}
                            value={archiveReason}
                            onChange={(e) => setArchiveReason(e.target.value)}
                            placeholder="Enter a reason for archiving this profile..."
                            className="mt-2"
                        />
                    </div>
                </div>
            </Modal>

            <style jsx global>{`
                .staff-edit-form .ant-tabs-nav {
                    margin-bottom: 24px;
                }

                .staff-edit-form .ant-tabs-tab {
                    padding: 12px 0;
                    font-size: 16px;
                }

                .staff-edit-form .ant-tabs-tab + .ant-tabs-tab {
                    margin-left: 32px;
                }

                .staff-edit-form .ant-card {
                    background: #fff;
                }

                .staff-edit-form .ant-card-head {
                    border-bottom: 1px solid #f0f0f0;
                    padding: 16px 24px;
                }

                .staff-edit-form .ant-card-body {
                    padding: 24px;
                }

                .staff-edit-form .ant-form-item {
                    margin-bottom: 24px;
                }

                .staff-edit-form .ant-form-item:last-child {
                    margin-bottom: 0;
                }
            `}</style>
        </div>
    );
}
