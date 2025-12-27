'use client'

import type { AxiosRequestConfig } from 'axios';

import type { ApiResponse } from '@/types/api/common';

import { api } from './config';

export class TypedApiClient<T> {
    constructor(private endpoint: string) {}
    
    async get<R = T>(path: string = '', config?: AxiosRequestConfig): Promise<R> {
        const response = await api.get<R>(`${this.endpoint}${path}`, config);
        return response.data;
    }
    
    async getList<P = Record<string, unknown>>(params?: P, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        const response = await api.get<ApiResponse<T>>(this.endpoint, {
            ...config,
            params,
        });
        return response.data;
    }
    
    async getById(id: number | string, config?: AxiosRequestConfig): Promise<T> {
        const response = await api.get<T>(`${this.endpoint}/${id}`, config);
        return response.data;
    }
    
    async post<R = T>(data: Partial<T>, config?: AxiosRequestConfig): Promise<R> {
        const response = await api.post<R>(this.endpoint, data, config);
        return response.data;
    }
    
    async put<R = T>(id: number | string, data: Partial<T>, config?: AxiosRequestConfig): Promise<R> {
        const response = await api.put<R>(`${this.endpoint}/${id}`, data, config);
        return response.data;
    }
    
    async patch<R = T>(id: number | string, data: Partial<T>, config?: AxiosRequestConfig): Promise<R> {
        const response = await api.patch<R>(`${this.endpoint}/${id}`, data, config);
        return response.data;
    }
    
    async delete(id: number | string, config?: AxiosRequestConfig): Promise<void> {
        await api.delete(`${this.endpoint}/${id}`, config);
    }
}