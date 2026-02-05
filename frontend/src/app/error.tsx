'use client';

import { useEffect } from 'react';
import { Button, Result } from 'antd';
import { ReloadOutlined, HomeOutlined } from '@ant-design/icons';
import Link from 'next/link';

interface ErrorProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
    useEffect(() => {
        // Log error to console in development, could be sent to error tracking service
        console.error('Application error:', {
            message: error.message,
            digest: error.digest,
            stack: error.stack,
        });
    }, [error]);

    return (
        <div className="min-h-[50vh] flex items-center justify-center">
            <Result
                status="error"
                title="Something went wrong"
                subTitle={
                    process.env.NODE_ENV === 'development'
                        ? error.message
                        : 'An unexpected error occurred. Please try again.'
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
                    <Link key="home" href="/">
                        <Button icon={<HomeOutlined />}>
                            Go to Dashboard
                        </Button>
                    </Link>,
                ]}
            />
        </div>
    );
}
