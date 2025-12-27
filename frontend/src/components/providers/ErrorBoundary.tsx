'use client'

import {Alert, Button} from 'antd';
import {Component, ReactNode} from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {hasError: false, error: null};
    }

    static getDerivedStateFromError(error: Error): State {
        return {hasError: true, error};
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Log error to error reporting service
        console.error('Error caught by boundary:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="p-4">
                    <Alert
                        title="Something went wrong"
                        description={
                            <div>
                                <p>{this.state.error?.message}</p>
                                <Button
                                    onClick={() => window.location.reload()}
                                    type="primary"
                                    className="mt-4"
                                >
                                    Reload Page
                                </Button>
                            </div>
                        }
                        type="error"
                        showIcon
                    />
                </div>
            );
        }

        return this.props.children;
    }
}
