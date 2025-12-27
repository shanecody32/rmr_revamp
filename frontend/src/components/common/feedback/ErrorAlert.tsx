import {Alert} from 'antd';

import type {ApiError} from '@/types/error';

interface ErrorAlertProps {
    error: ApiError;
    onClose?: () => void;
}

export default function ErrorAlert({error, onClose}: ErrorAlertProps) {
    const getErrorMessage = (error: ApiError) => {
        if (error.status === 404) {
            return 'The requested resource was not found.';
        }
        if (error.status === 401) {
            return 'You are not authorized to perform this action.';
        }
        if (error.status === 403) {
            return 'You do not have permission to perform this action.';
        }
        if (error.status === 500) {
            return 'An internal server error occurred. Please try again later.';
        }
        return error.message || 'An unexpected error occurred.';
    };

    return (
        <Alert
            title="Error"
            description={getErrorMessage(error)}
            type="error"
            closable
            onClose={onClose}
            className="mb-4"
        />
    );
}
