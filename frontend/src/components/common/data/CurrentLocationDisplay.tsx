'use client'

import {Space, Typography} from 'antd';
import {useEffect, useState} from 'react';

import {useLocation} from '@/contexts/LocationContext';
import {fetchCityById} from '@/lib/api/locations';

import LocationDisplay from './LocationDisplay';

const {Text} = Typography;

interface CurrentLocationDisplayProps {
    countryId?: number | null;
    stateId?: number | null;
    cityId?: number | null;
}

export default function CurrentLocationDisplay({
                                                   countryId,
                                                   stateId,
                                                   cityId
                                               }: CurrentLocationDisplayProps) {
    const {addCityToCache, citiesCache} = useLocation();
    // We only need setLoading for the loading state management in loadCityData
    const [, setLoading] = useState(false);
    const [hasLocation, setHasLocation] = useState(false);

    // Check if there is any location data
    useEffect(() => {
        setHasLocation(!!countryId || !!stateId || !!cityId);
    }, [countryId, stateId, cityId]);

    // Load city data if needed and not in cache
    useEffect(() => {
        const loadCityData = async () => {
            if (!cityId) return;
            if (!citiesCache || (citiesCache && !citiesCache[cityId])) {
                try {
                    setLoading(true);
                    const city = await fetchCityById(cityId);
                    if (city) {
                        addCityToCache(city);
                    }
                } catch (error) {
                    console.error('Error loading city data:', error);
                } finally {
                    setLoading(false);
                }
            }
        };

        loadCityData();
    }, [cityId, citiesCache, addCityToCache]);

    return (
        <Space orientation="vertical" className="mb-4 w-full">
            <div>
                <Text strong>Current Location:</Text>{' '}
                {hasLocation ? (
                    <LocationDisplay
                        countryId={countryId}
                        stateId={stateId}
                        cityId={cityId}
                    />
                ) : (
                    <Text type="secondary">No location set</Text>
                )}
            </div>
        </Space>
    );
}
