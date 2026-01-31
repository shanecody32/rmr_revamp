export const bandFilterOptions = [
    {
        key: 'verified_approved',
        label: 'Verified & Approved',
        description: 'Fully validated bands'
    },
    {
        key: 'verified_pending',
        label: 'Verified Only',
        description: 'Identity verified, awaiting approval'
    },
    {
        key: 'approved_only',
        label: 'Approved Only',
        description: 'Content approved, verification needed'
    },
    {
        key: 'pending_all',
        label: 'Pending All',
        description: 'Awaiting verification & approval'
    }
] as const;

export const radioStationFilterOptions = [
    {
        key: 'active_verified',
        label: 'Active & Verified',
        description: 'Currently broadcasting and verified'
    },
    {
        key: 'active_pending',
        label: 'Active Only',
        description: 'Currently broadcasting, pending verification'
    },
    {
        key: 'verified_inactive',
        label: 'Verified Only',
        description: 'Verified but not currently active'
    },
    {
        key: 'pending_all',
        label: 'Pending All',
        description: 'Inactive and pending verification'
    }
] as const;

export const staffFilterOptions = [
    {
        key: 'verified_approved',
        label: 'Verified & Approved',
        description: 'Fully validated staff members'
    },
    {
        key: 'verified_pending',
        label: 'Verified Only',
        description: 'Identity verified, awaiting approval'
    },
    {
        key: 'approved_only',
        label: 'Approved Only',
        description: 'Content approved, verification needed'
    },
    {
        key: 'pending_all',
        label: 'Pending All',
        description: 'Awaiting verification & approval'
    },
    {
        key: 'has_playlist',
        label: 'Has Playlist',
        description: 'Staff members with playlist submissions'
    }
] as const;

export type FilterOption = {
    key: string;
    label: string;
    description: string;
};