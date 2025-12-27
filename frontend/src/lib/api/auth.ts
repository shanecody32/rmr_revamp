import {api} from './config';
import type {CurrentResponse, LoginRequest, LoginResponse} from '@/types/api/auth';

export async function login(params: LoginRequest): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/login', params);
    return response.data;
}

export async function fetchCurrentUser(): Promise<CurrentResponse> {
    const response = await api.get<CurrentResponse>('/auth/current');
    return response.data;
}
