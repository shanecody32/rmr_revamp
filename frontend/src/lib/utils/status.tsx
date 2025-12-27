import {Tag} from "antd";


interface StatusDisplay {
    color: string;
    text: string;
}

export const getStatusDisplay = (verified: boolean, approved: boolean): StatusDisplay => {
    if (verified && approved) {
        return {color: 'success', text: 'Verified & Approved'};
    }
    if (verified && !approved) {
        return {color: 'processing', text: 'Verified Only'};
    }
    if (!verified && approved) {
        return {color: 'warning', text: 'Approved Only'};
    }
    return {color: 'default', text: 'Pending'};
};

export const StatusTag = ({verified, approved}: { verified: boolean; approved: boolean }) => {
    const status = getStatusDisplay(verified, approved);
    return <Tag color={status.color}>{status.text}</Tag>;
};

export const ActiveStatusTag = ({active}: { active: boolean }) => (
    <Tag color={active ? 'green' : 'red'}>
        {active ? 'Active' : 'Inactive'}
    </Tag>
);
