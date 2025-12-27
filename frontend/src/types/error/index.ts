export interface ApiError {
    status?: number;
    message: string;
    details?: Record<string, string[]>;
}

export interface ErrorState {
    error: ApiError | null;
    hasError: boolean;
}