export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    token: string;
    pid: string;
    first_name: string;
    last_name: string;
    is_verified: boolean;
}

export interface CurrentResponse {
    pid: string;
    first_name: string;
    last_name: string;
    email: string;
}
