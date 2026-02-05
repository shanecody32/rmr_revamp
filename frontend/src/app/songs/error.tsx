'use client';

import { useEffect } from 'react';
import { Button, Result } from 'antd';
import { ReloadOutlined, UnorderedListOutlined } from '@ant-design/icons';
import Link from 'next/link';

interface ErrorProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export default function SongsError({ error, reset }: ErrorProps) {
    useEffect(() => {
        console.error('Songs section error:', {
            message: error.message,
            digest: error.digest,
        });
    }, [error]);

    return (
        <div className="min-h-[50vh] flex items-center justify-center">
            <Result
                status="error"
                title="Error loading songs"
                subTitle={
                    process.env.NODE_ENV === 'development'
                        ? error.message
                        : 'Failed to load song data. Please try again.'
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
                    <Link key="list" href="/songs">
                        <Button icon={<UnorderedListOutlined />}>
                            Back to Songs
                        </Button>
                    </Link>,
                ]}
            />
        </div>
    );
}
