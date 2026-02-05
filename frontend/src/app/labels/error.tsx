'use client';

import { useEffect } from 'react';
import { Button, Result } from 'antd';
import { ReloadOutlined, UnorderedListOutlined } from '@ant-design/icons';
import Link from 'next/link';

interface ErrorProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export default function LabelsError({ error, reset }: ErrorProps) {
    useEffect(() => {
        console.error('Labels section error:', {
            message: error.message,
            digest: error.digest,
        });
    }, [error]);

    return (
        <div className="min-h-[50vh] flex items-center justify-center">
            <Result
                status="error"
                title="Error loading labels"
                subTitle={
                    process.env.NODE_ENV === 'development'
                        ? error.message
                        : 'Failed to load label data. Please try again.'
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
                    <Link key="list" href="/labels">
                        <Button icon={<UnorderedListOutlined />}>
                            Back to Labels
                        </Button>
                    </Link>,
                ]}
            />
        </div>
    );
}
