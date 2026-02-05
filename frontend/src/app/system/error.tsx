'use client';

import { useEffect } from 'react';
import { Button, Result } from 'antd';
import { ReloadOutlined, SettingOutlined } from '@ant-design/icons';
import Link from 'next/link';

interface ErrorProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export default function SystemError({ error, reset }: ErrorProps) {
    useEffect(() => {
        console.error('System section error:', {
            message: error.message,
            digest: error.digest,
        });
    }, [error]);

    return (
        <div className="min-h-[50vh] flex items-center justify-center">
            <Result
                status="error"
                title="Error loading system settings"
                subTitle={
                    process.env.NODE_ENV === 'development'
                        ? error.message
                        : 'Failed to load system data. Please try again.'
                }
                extra={[
                    <Button
                        key="retry"
                        type="primary"
                        icon={<ReloadOutlined />}
                        onClick={reset}
                    >
                        Try Again
                    </Button>,
                    <Link key="system" href="/system">
                        <Button icon={<SettingOutlined />}>
                            Back to System
                        </Button>
                    </Link>,
                ]}
            />
        </div>
    );
}
