'use client'

import {Modal} from 'antd';
import {ReactNode} from 'react';

interface AddModalProps {
    title: string;
    open: boolean;
    onCancel: () => void;
    onOk: () => void;
    confirmLoading?: boolean;
    children: ReactNode;
}

export default function AddModal({
                                     title,
                                     open,
                                     onCancel,
                                     onOk,
                                     confirmLoading,
                                     children
                                 }: AddModalProps) {
    return (
        <Modal
            title={title}
            open={open}
            onCancel={onCancel}
            onOk={onOk}
            confirmLoading={confirmLoading}
            okText="Save"
            cancelText="Cancel"
        >
            {children}
        </Modal>
    );
}
