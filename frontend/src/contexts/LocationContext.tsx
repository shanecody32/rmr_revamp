'use client'

import * as React from 'react';

import {fetchAllCountries, fetchAllStates} from '@/lib/api/locations';
import type {CityResponse, CountryResponse, StateResponse} from '@/types/api/locations';

interface LocationContextType {
    // Data collections
    countries: CountryResponse[];
    states: StateResponse[];
    citiesCache: Record<number, CityResponse>;

    // Loading states
    isLoadingCountries: boolean;
    isLoadingStates: boolean;

    // Lookup functions
    getCountryName: (id?: number | null) => string;
    getStateName: (id?: number | null) => string;
    getCityName: (id?: number | null) => string;

    // Cache management
    addCityToCache: (city: CityResponse) => void;
    addCitiesToCache: (cities: CityResponse[]) => void;
}

const LocationContext = React.createContext<LocationContextType | undefined>(undefined);

// Special case mapping for specific locations that might not be in the API
const SPECIAL_LOCATIONS = {
    cities: {
        // Add specific city overrides here
        // id: { name: 'CorrectName', state_id: stateId, country_id: countryId }
    },
    states: {
        // Add specific state overrides here
        // id: { name: 'CorrectName', country_id: countryId }
    },
    countries: {
        // Add specific country overrides here
        // id: { name: 'CorrectName' }
        104: {name: 'Ireland'}
    }
};

export function LocationProvider({children}: { children: React.ReactNode }) {
    const [countries, setCountries] = React.useState<CountryResponse[]>([]);
    const [states, setStates] = React.useState<StateResponse[]>([]);
    const [citiesCache, setCitiesCache] = React.useState<Record<number, CityResponse>>({});

    const [isLoadingCountries, setIsLoadingCountries] = React.useState(true);
    const [isLoadingStates, setIsLoadingStates] = React.useState(true);

    // Load countries and states on mount
    React.useEffect(() => {
        const loadInitialData = async () => {
            try {
                // Load countries (small dataset, load all at once)
                setIsLoadingCountries(true);
                const countriesData = await fetchAllCountries();
                setCountries(countriesData || []);
                setIsLoadingCountries(false);

                // Load states (medium dataset, load all at once)
                setIsLoadingStates(true);
                const statesData = await fetchAllStates();
                setStates(statesData || []);
                setIsLoadingStates(false);
            } catch (error) {
                console.error('Error loading location data:', error);
                setIsLoadingCountries(false);
                setIsLoadingStates(false);
            }
        };

        loadInitialData();
    }, []);

    // Lookup functions with improved error handling
    const getCountryName = React.useCallback((id?: number | null): string => {
        if (!id) return 'Unknown';

        // Check special case mapping first
        // Use type assertion to help TypeScript understand the structure
        type SpecialCountryType = { name: string };
        const specialCountryKey = id as keyof typeof SPECIAL_LOCATIONS.countries;
        const specialCountry = SPECIAL_LOCATIONS.countries[specialCountryKey] as SpecialCountryType | undefined;

        if (specialCountry && specialCountry.name) {
            return specialCountry.name;
        }

        // Then check loaded data
        if (!countries || !Array.isArray(countries)) return `Country ID: ${id}`;
        const country = countries.find(c => c.id === id);

        return country ? country.name : `Country ID: ${id}`;
    }, [countries]);

    const getStateName = React.useCallback((id?: number | null): string => {
        if (!id) return 'Unknown';

        // Check special case mapping first
        // Use type assertion to help TypeScript understand the structure
        type SpecialStateType = { name: string; country_id?: number };
        const specialStateKey = id as keyof typeof SPECIAL_LOCATIONS.states;
        const specialState = SPECIAL_LOCATIONS.states[specialStateKey] as SpecialStateType | undefined;

        if (specialState && specialState.name) {
            return specialState.name;
        }

        // Then check loaded data
        if (!states || !Array.isArray(states)) return `State ID: ${id}`;
        const state = states.find(s => s.id === id);

        return state ? state.name : `State ID: ${id}`;
    }, [states]);

    const getCityName = React.useCallback((id?: number | null): string => {
        if (!id) return 'Unknown';

        // Check special case mapping first
        // Use type assertion to help TypeScript understand the structure
        type SpecialCityType = { name: string; state_id?: number; country_id?: number };
        const specialCityKey = id as keyof typeof SPECIAL_LOCATIONS.cities;
        const specialCity = SPECIAL_LOCATIONS.cities[specialCityKey] as SpecialCityType | undefined;

        if (specialCity && specialCity.name) {
            return specialCity.name;
        }

        // Then check cache
        if (!citiesCache || !citiesCache[id]) {
            return `City ID: ${id}`;
        }

        return citiesCache[id]?.name || 'Unknown';
    }, [citiesCache]);

    // Cache management
    const addCityToCache = React.useCallback((city: CityResponse) => {
        if (!city) return;
        setCitiesCache(prev => ({
            ...prev,
            [city.id]: city
        }));
    }, []);

    const addCitiesToCache = React.useCallback((cities: CityResponse[]) => {
        if (!cities || !Array.isArray(cities)) return;
        setCitiesCache(prev => {
            const newCache = {...prev};
            cities.forEach(city => {
                if (city && city.id) {
                    newCache[city.id] = city;
                }
            });
            return newCache;
        });
    }, []);

    const contextValue = {
        countries,
        states,
        citiesCache,
        isLoadingCountries,
        isLoadingStates,
        getCountryName,
        getStateName,
        getCityName,
        addCityToCache,
        addCitiesToCache
    };

    return (
        <LocationContext.Provider value={contextValue}>
            {children}
        </LocationContext.Provider>
    );
}

export function useLocation() {
    const context = React.useContext(LocationContext);
    if (context === undefined) {
        throw new Error('{ useLocation } must be used within a LocationProvider');
    }
    return context;
}
