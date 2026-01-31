'use client'

import {Alert, Typography} from 'antd';
import React from 'react';

const {Text} = Typography;

interface MergeModalHeaderProps {
    error: string | null;
}

export default function MergeModalHeader({error}: MergeModalHeaderProps) {
    return (
        <>
            <Alert
                title="Merge Data Selection"
                description={
                    <div>
                        <p>Select which data to keep for each field from the available songs.</p>
                        <p>The <Text className="text-blue-600 font-medium">original song</Text> will be kept, and other
                            songs will be merged into it.</p>
                    </div>
                }
                type="info"
                showIcon
                className="mb-6"
            />

            {error && (
                <Alert
                    title="Error"
                    description={error}
                    type="error"
                    showIcon
                    className="mb-6"
                />
            )}
        </>
    );
}
