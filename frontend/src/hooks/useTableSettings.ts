import { useCallback, useState, useEffect } from 'react';

export type TableSize = 'large' | 'middle' | 'small';
export type DensitySize = TableSize | undefined;

interface TableSettings {
    density: TableSize;
    columnSettings: Record<string, any>;
    fullScreen: boolean;
    visibleColumns?: string[];
}

interface UseTableSettingsParams {
    storageKey: string;
    defaultDensity?: TableSize;
    defaultVisibleColumns?: string[];
}

export function useTableSettings({
    storageKey,
    defaultDensity = 'middle',
    defaultVisibleColumns = []
}: UseTableSettingsParams) {
    // Load initial settings from localStorage
    const getInitialSettings = (): TableSettings => {
        if (typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem(storageKey);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    // Validate the parsed data has the expected structure
                    if (parsed && typeof parsed === 'object' && parsed.density) {
                        return {
                            density: parsed.density || defaultDensity,
                            columnSettings: parsed.columnSettings || {},
                            fullScreen: parsed.fullScreen || false,
                            visibleColumns: parsed.visibleColumns || defaultVisibleColumns
                        };
                    }
                }
            } catch (e) {
                console.warn('Failed to parse table settings from localStorage:', e);
            }
        }
        return {
            density: defaultDensity,
            columnSettings: {},
            fullScreen: false,
            visibleColumns: defaultVisibleColumns
        };
    };

    const [settings, setSettings] = useState<TableSettings>(getInitialSettings);
    const [isInitialized, setIsInitialized] = useState(false);

    // Initialize on mount
    useEffect(() => {
        setIsInitialized(true);
    }, []);

    // Save settings to localStorage whenever they change (after initialization)
    useEffect(() => {
        if (isInitialized && typeof window !== 'undefined') {
            localStorage.setItem(storageKey, JSON.stringify(settings));
        }
    }, [settings, storageKey, isInitialized]);

    const updateDensity = useCallback((density: TableSize) => {
        setSettings(prev => ({ ...prev, density }));
    }, []);

    const updateColumnSettings = useCallback((columnSettings: Record<string, any>) => {
        setSettings(prev => ({ ...prev, columnSettings }));
    }, []);

    const updateFullScreen = useCallback((fullScreen: boolean) => {
        setSettings(prev => ({ ...prev, fullScreen }));
    }, []);

    const updateVisibleColumns = useCallback((visibleColumns: string[]) => {
        setSettings(prev => ({ ...prev, visibleColumns }));
    }, []);

    const resetSettings = useCallback(() => {
        const defaultSettings = {
            density: defaultDensity,
            columnSettings: {},
            fullScreen: false,
            visibleColumns: defaultVisibleColumns
        };
        setSettings(defaultSettings);
        if (typeof window !== 'undefined') {
            localStorage.setItem(storageKey, JSON.stringify(defaultSettings));
        }
    }, [defaultDensity, defaultVisibleColumns, storageKey]);

    return {
        settings,
        updateDensity,
        updateColumnSettings,
        updateFullScreen,
        updateVisibleColumns,
        resetSettings
    };
}