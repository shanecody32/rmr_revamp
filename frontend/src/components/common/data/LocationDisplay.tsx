'use client'

import {Spin} from 'antd';
import {useEffect, useState} from 'react';

import {useLocation} from '@/contexts/LocationContext';
import {fetchCityById} from '@/lib/api/locations';

interface LocationDisplayProps {
    countryId?: number | null;
    stateId?: number | null;
    cityId?: number | null;
}

export default function LocationDisplay({countryId, stateId, cityId}: LocationDisplayProps) {
    const {getCountryName, getStateName, getCityName, addCityToCache, citiesCache} = useLocation();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load city and related location data if needed
    useEffect(() => {
        const loadLocationData = async () => {
            if (!cityId && !stateId && !countryId) return;

            try {
                setLoading(true);
                setError(null);

                // Load city data if needed
                if (cityId && (!citiesCache || !citiesCache[cityId])) {
                    const city = await fetchCityById(cityId);
                    if (city) {
                        addCityToCache(city);
                    }
                }

                // If we need to load country or state data, we can add that here
                // This is handled by the LocationContext, but we can explicitly load it if needed

            } catch (error) {
                console.error('Error loading location data:', error);
                setError('Failed to load location data');
            } finally {
                setLoading(false);
            }
        };

        loadLocationData();
    }, [cityId, stateId, countryId, citiesCache, addCityToCache]);

    if (loading) {
        return <Spin size="small"/>;
    }

    if (error) {
        return <>Error: {error}</>;
    }

    // Build location string with proper comma separation
    const parts = [];

    // Always try to display city first if available
    if (cityId) {
        try {
            const cityName = getCityName(cityId);
            if (cityName !== 'Unknown' && !cityName.startsWith('City ID:')) {
                parts.push(cityName);
            }
        } catch (err) {
            console.error('Error getting city name:', err);
        }
    }

    // Next, display state if available
    if (stateId) {
        try {
            const stateName = getStateName(stateId);
            if (stateName !== 'Unknown' && !stateName.startsWith('State ID:')) {
                parts.push(stateName);
            }
        } catch (err) {
            console.error('Error getting state name:', err);
        }
    }

    // Finally, display country if available
    if (countryId) {
        try {
            const countryName = getCountryName(countryId);
            if (countryName !== 'Unknown' && !countryName.startsWith('Country ID:')) {
                parts.push(countryName);
            }
        } catch (err) {
            console.error('Error getting country name:', err);
        }
    }

    return parts.length > 0 ? <>{parts.join(', ')}</> : <>No location data</>;
}
