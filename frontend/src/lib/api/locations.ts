'use client'

import type {ApiResponse} from '@/types/api/common';
import {nameFilterTypeMap} from '@/types/api/common';
import type {
  CityResponse,
  CountryResponse,
  GenreResponse,
  StateResponse,
  SubGenreResponse
} from '@/types/api/locations';

import {api} from './config';

// Countries
export const searchCountries = async (name: string) => {
    const response = await api.get<ApiResponse<CountryResponse>>('/countries', {
        params: {
            name,
            name_filter_type: nameFilterTypeMap['contains'],
            page: 1,
            page_size: 10
        }
    });
    return response.data.results;
};

export const fetchCountryById = async (id: number): Promise<CountryResponse | null> => {
    try {
        const response = await api.get<CountryResponse>(`/countries/${id}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching country ${id}:`, error);
        return null;
    }
};

export const fetchAllCountries = async (): Promise<CountryResponse[]> => {
    try {
        const response = await api.get<ApiResponse<CountryResponse>>('/countries', {
            params: {
                page: 1,
                page_size: 300 // Assuming we have less than 300 countries
            }
        });
        return response.data.results || [];
    } catch (error) {
        console.error('Error fetching all countries:', error);
        return [];
    }
};

// States
export const searchStates = async (name: string, countryId?: number) => {
    const response = await api.get<ApiResponse<StateResponse>>('/states', {
        params: {
            name,
            name_filter_type: nameFilterTypeMap['contains'],
            country_id: countryId,
            page: 1,
            page_size: 10
        }
    });
    return response.data.results;
};

export const fetchStateById = async (id: number): Promise<StateResponse | null> => {
    try {
        const response = await api.get<StateResponse>(`/states/${id}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching state ${id}:`, error);
        return null;
    }
};

export const fetchAllStates = async (): Promise<StateResponse[]> => {
    try {
        const response = await api.get<ApiResponse<StateResponse>>('/states', {
            params: {
                page: 1,
                page_size: 1000 // Assuming we have less than 1000 states globally
            }
        });
        return response.data.results || [];
    } catch (error) {
        console.error('Error fetching all states:', error);
        return [];
    }
};

export const fetchStatesByCountry = async (countryId: number): Promise<StateResponse[]> => {
    try {
        const response = await api.get<ApiResponse<StateResponse>>('/states', {
            params: {
                country_id: countryId,
                page: 1,
                page_size: 100 // Assuming most countries have fewer than 100 states
            }
        });
        return response.data.results || [];
    } catch (error) {
        console.error(`Error fetching states for country ${countryId}:`, error);
        return [];
    }
};

// Cities
export const searchCities = async (name?: string, params?: { stateId?: number; countryId?: number }) => {
    const queryParams: Record<string, unknown> = {
        page: 1,
        page_size: 20
    };
    if (name) {
        queryParams.name = name;
        queryParams.name_filter_type = nameFilterTypeMap['contains'];
    }
    if (params?.stateId) {
        queryParams.state_id = params.stateId;
    }
    if (params?.countryId) {
        queryParams.country_id = params.countryId;
    }
    const response = await api.get<ApiResponse<CityResponse>>('/cities', { params: queryParams });
    return response.data.results;
};

export const fetchCityById = async (cityId: number): Promise<CityResponse | null> => {
    try {
        const response = await api.get<CityResponse>(`/cities/${cityId}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching city ${cityId}:`, error);
        return null;
    }
};

export const fetchCitiesByState = async (stateId: number, page = 1, pageSize = 50): Promise<CityResponse[]> => {
    try {
        const response = await api.get<ApiResponse<CityResponse>>('/cities', {
            params: {
                state_id: stateId,
                page,
                page_size: pageSize
            }
        });
        return response.data.results || [];
    } catch (error) {
        console.error(`Error fetching cities for state ${stateId}:`, error);
        return [];
    }
};

// Genres
export const searchGenres = async (name: string) => {
    const response = await api.get<ApiResponse<GenreResponse>>('/genres', {
        params: {
            name,
            name_filter_type: nameFilterTypeMap['contains'],
            page: 1,
            page_size: 10
        }
    });
    return response.data.results;
};

// Sub-Genres
export const searchSubGenres = async (name: string, genreId?: number) => {
    const response = await api.get<ApiResponse<SubGenreResponse>>('/sub_genres', {
        params: {
            name,
            name_filter_type: nameFilterTypeMap['contains'],
            genre_id: genreId,
            page: 1,
            page_size: 10
        }
    });
    return response.data.results;
};
