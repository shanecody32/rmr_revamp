export type UserRole = 'superadmin' | 'admin' | 'editor' | 'viewer';

export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    name: string;
    role?: UserRole;
    isVerified?: boolean;
}

export interface AuthState {
    user: User | null;
    token: string | null;
    isLoading: boolean;
}