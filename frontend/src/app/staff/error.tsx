'use client';

import { useEffect } from 'react';
import { Button, Result } from 'antd';
import { ReloadOutlined, UnorderedListOutlined } from '@ant-design/icons';
import Link from 'next/link';

interface ErrorProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export default function StaffError({ error, reset }: ErrorProps) {
    useEffect(() => {
        console.error('Staff section error:', {
            message: error.message,
            digest: error.digest,
        });
    }, [error]);

    return (
        <div className="min-h-[50vh] flex items-center justify-center">
            <Result
                status="error"
                title="Error loading staff"
                subTitle={
                    process.env.NODE_ENV === 'development'
                        ? error.message
                        : 'Failed to load staff data. Please try again.'
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
                    <Link key="list" href="/staff">
                        <Button icon={<UnorderedListOutlined />}>
                            Back to Staff
                        </Button>
                    </Link>,
                ]}
            />
        </div>
    );
}
