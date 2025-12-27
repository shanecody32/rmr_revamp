'use client'

import type {ApiParams, ApiResponse} from '@/types/api/common';

import {api} from '../api/config';

export class ApiService<T> {
    constructor(private endpoint: string) {
    }

    async search(params: ApiParams): Promise<T[]> {
        const response = await api.get<ApiResponse<T>>(this.endpoint, {params});
        return response.data.results;
    }

    async getById(id: number): Promise<T> {
        const response = await api.get<T>(`${this.endpoint}/${id}`);
        return response.data;
    }

    async create(data: Partial<T>): Promise<T> {
        const response = await api.post<T>(this.endpoint, data);
        return response.data;
    }

    async update(id: number, data: Partial<T>): Promise<T> {
        const response = await api.put<T>(`${this.endpoint}/${id}`, data);
        return response.data;
    }

    async delete(id: number): Promise<void> {
        await api.delete(`${this.endpoint}/${id}`);
    }
}