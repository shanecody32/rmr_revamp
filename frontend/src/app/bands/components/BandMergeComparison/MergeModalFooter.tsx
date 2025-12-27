'use client'

import {Alert, Space} from 'antd';
import React from 'react';

interface MergeModalFooterProps {
    children?: React.ReactNode;
}

export default function MergeModalFooter({children}: MergeModalFooterProps) {
    return (
        <Space direction="vertical" className="w-full mt-6">
            <Alert
                title="Warning"
                description="Merging bands will delete the selected duplicate bands and keep only the original band with the merged data. This action cannot be undone."
                type="warning"
                showIcon
            />
            {children}
        </Space>
    );
}