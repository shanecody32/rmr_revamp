import {useCallback, useState} from 'react';

import type {BaseEntity} from '@/types/api/common';

export function useDetailDrawer<T extends BaseEntity>() {
    const [selectedItem, setSelectedItem] = useState<T | null>(null);
    const [drawerVisible, setDrawerVisible] = useState(false);

    const showDrawer = useCallback((item: T) => {
        setSelectedItem(item);
        setDrawerVisible(true);
    }, []);

    const closeDrawer = useCallback(() => {
        setDrawerVisible(false);
        // Don't clear selectedItem immediately to prevent UI flicker
        setTimeout(() => {
            setSelectedItem(null);
        }, 300); // Match drawer close animation duration
    }, []);

    const updateSelectedItem = useCallback((item: T) => {
        setSelectedItem(item);
    }, []);

    return {
        selectedItem,
        drawerVisible,
        showDrawer,
        closeDrawer,
        setSelectedItem: updateSelectedItem,
    };
}
