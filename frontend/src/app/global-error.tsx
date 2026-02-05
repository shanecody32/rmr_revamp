'use client';

import { useEffect } from 'react';

interface GlobalErrorProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
    useEffect(() => {
        // Log the error to console in development
        // In production, this could send to an error tracking service
        console.error('Global application error:', {
            message: error.message,
            digest: error.digest,
            stack: error.stack,
            timestamp: new Date().toISOString(),
        });
    }, [error]);

    return (
        <html lang="en">
            <body>
                <div style={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f5f5f5',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                }}>
                    <div style={{
                        textAlign: 'center',
                        padding: '40px',
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                        maxWidth: '500px',
                    }}>
                        <div style={{
                            width: '64px',
                            height: '64px',
                            margin: '0 auto 24px',
                            backgroundColor: '#ff4d4f',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <span style={{ color: 'white', fontSize: '32px' }}>!</span>
                        </div>
                        <h1 style={{
                            margin: '0 0 16px',
                            fontSize: '24px',
                            fontWeight: 600,
                            color: '#1f2937',
                        }}>
                            Application Error
                        </h1>
                        <p style={{
                            margin: '0 0 24px',
                            fontSize: '14px',
                            color: '#6b7280',
                        }}>
                            {process.env.NODE_ENV === 'development'
                                ? error.message
                                : 'A critical error occurred. Please try refreshing the page.'}
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button
                                onClick={reset}
                                style={{
                                    padding: '8px 24px',
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    color: 'white',
                                    backgroundColor: '#1677ff',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                }}
                            >
                                Try Again
                            </button>
                            <button
                                onClick={() => window.location.href = '/'}
                                style={{
                                    padding: '8px 24px',
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    color: '#1f2937',
                                    backgroundColor: 'white',
                                    border: '1px solid #d9d9d9',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                }}
                            >
                                Go to Dashboard
                            </button>
                        </div>
                        {error.digest && (
                            <p style={{
                                marginTop: '24px',
                                fontSize: '12px',
                                color: '#9ca3af',
                            }}>
                                Error ID: {error.digest}
                            </p>
                        )}
                    </div>
                </div>
            </body>
        </html>
    );
}
