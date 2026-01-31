'use client'

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { systemApi } from '@/lib/api/system';
import type { BackfillJobState, TaskJobState } from '@/types/api/system';
import { getScanState, type ScanStateResponse, type ScanEntityType } from '@/lib/api/duplicateScan';
import { useToast } from '@/hooks/ui/use-toast';

interface JobContextType {
    backfillProgress: BackfillJobState | null;
    genreUpdateProgress: TaskJobState | null;
    /** Per-entity scan progress, keyed by entity_type string */
    duplicateScanProgress: Record<string, ScanStateResponse>;
    isBackfillRunning: boolean;
    isGenreUpdateRunning: boolean;
    /** Check if a specific entity type scan is running */
    isDuplicateScanRunning: (entityType: ScanEntityType) => boolean;
    /** Check if any duplicate scan is running */
    isAnyDuplicateScanRunning: boolean;
    /** Get scan state for a specific entity type */
    getScanProgress: (entityType: ScanEntityType) => ScanStateResponse | null;
    refreshProgress: () => Promise<void>;
}

const JobContext = createContext<JobContextType | undefined>(undefined);

export function JobProvider({ children }: { children: React.ReactNode }) {
    const [backfillProgress, setBackfillProgress] = useState<BackfillJobState | null>(null);
    const [genreUpdateProgress, setGenreUpdateProgress] = useState<TaskJobState | null>(null);
    const [duplicateScanProgress, setDuplicateScanProgress] = useState<Record<string, ScanStateResponse>>({});
    const { toast } = useToast();

    const prevBackfillRunning = useRef<boolean>(false);
    const prevGenreRunning = useRef<boolean>(false);
    const prevDupScansRunning = useRef<Record<string, boolean>>({});
    const isInitialMount = useRef<boolean>(true);

    const fetchProgress = async () => {
        try {
            const [backfillData, genreData] = await Promise.all([
                systemApi.getBackfillProgress(),
                systemApi.getAlbumGenreUpdateProgress(),
            ]);

            if (!isInitialMount.current) {
                // Check for backfill completion
                if (prevBackfillRunning.current && !backfillData.is_running) {
                    if (backfillData.last_error) {
                         toast({
                            variant: 'destructive',
                            title: 'Backfill Failed',
                            description: backfillData.last_error,
                            duration: 10
                        });
                    } else {
                        toast({
                            title: 'Backfill Complete',
                            description: 'Similarity data backfill has finished successfully.',
                            duration: 10
                        });
                    }
                }

                // Check for genre update completion
                if (prevGenreRunning.current && !genreData.is_running) {
                    if (genreData.last_error) {
                        toast({
                            variant: 'destructive',
                            title: 'Genre Update Failed',
                            description: genreData.last_error,
                            duration: 10
                        });
                    } else {
                        toast({
                            title: 'Genre Update Complete',
                            description: 'Album genre charting update has finished successfully.',
                            duration: 10
                        });
                    }
                }
            }

            setBackfillProgress(backfillData);
            setGenreUpdateProgress(genreData);
            prevBackfillRunning.current = backfillData.is_running;
            prevGenreRunning.current = genreData.is_running;
            isInitialMount.current = false;
        } catch (err) {
            console.error('Failed to fetch job progress:', err);
        }
    };

    useEffect(() => {
        // Do one initial fetch, then switch to SSE
        fetchProgress();

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const eventSource = new EventSource(`${apiUrl}/system/jobs/stream`);

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data) as {
                    backfill: BackfillJobState;
                    genre_update: TaskJobState;
                    duplicate_scans: ScanStateResponse[];
                };

                if (!isInitialMount.current) {
                    // Check for backfill completion
                    if (prevBackfillRunning.current && !data.backfill.is_running) {
                        if (data.backfill.last_error) {
                            toast({
                                variant: 'destructive',
                                title: 'Backfill Failed',
                                description: data.backfill.last_error,
                                duration: 10
                            });
                        } else {
                            toast({
                                title: 'Backfill Complete',
                                description: 'Similarity data backfill has finished successfully.',
                                duration: 10
                            });
                        }
                    }

                    // Check for genre update completion
                    if (prevGenreRunning.current && !data.genre_update.is_running) {
                        if (data.genre_update.last_error) {
                            toast({
                                variant: 'destructive',
                                title: 'Genre Update Failed',
                                description: data.genre_update.last_error,
                                duration: 10
                            });
                        } else {
                            toast({
                                title: 'Genre Update Complete',
                                description: 'Album genre charting update has finished successfully.',
                                duration: 10
                            });
                        }
                    }

                    // Check for duplicate scan completions per entity type
                    for (const [entityType, wasRunning] of Object.entries(prevDupScansRunning.current)) {
                        if (wasRunning) {
                            const stillRunning = data.duplicate_scans.find(s => s.entity_type === entityType);
                            if (!stillRunning) {
                                // This entity type scan has completed (no longer in the running list)
                                toast({
                                    title: 'Duplicate Scan Complete',
                                    description: `${entityType} duplicate scan has finished.`,
                                    duration: 10
                                });
                            }
                        }
                    }
                }

                setBackfillProgress(data.backfill);
                setGenreUpdateProgress(data.genre_update);

                // Update per-entity scan progress
                // The SSE only sends currently-running scans, so mark any
                // previously-tracked scans that are no longer present as stopped.
                setDuplicateScanProgress(prev => {
                    const next = { ...prev };
                    const incomingTypes = new Set<string>();
                    for (const scan of data.duplicate_scans) {
                        next[scan.entity_type] = scan;
                        incomingTypes.add(scan.entity_type);
                    }
                    for (const key of Object.keys(next)) {
                        if (!incomingTypes.has(key) && next[key].is_running) {
                            next[key] = { ...next[key], is_running: false };
                        }
                    }
                    return next;
                });

                // Track which entity scans are running
                const newRunning: Record<string, boolean> = {};
                for (const scan of data.duplicate_scans) {
                    newRunning[scan.entity_type] = scan.is_running;
                }
                prevDupScansRunning.current = newRunning;

                prevBackfillRunning.current = data.backfill.is_running;
                prevGenreRunning.current = data.genre_update.is_running;
                isInitialMount.current = false;
            } catch (err) {
                console.error('Failed to parse job stream event:', err);
            }
        };

        eventSource.onerror = () => {
            console.error('Job stream connection lost, reconnecting...');
        };

        return () => eventSource.close();
    }, []);

    const isDuplicateScanRunning = useCallback((entityType: ScanEntityType): boolean => {
        const state = duplicateScanProgress[entityType];
        return state?.is_running || false;
    }, [duplicateScanProgress]);

    const isAnyDuplicateScanRunning = Object.values(duplicateScanProgress).some(s => s.is_running);

    const getScanProgress = useCallback((entityType: ScanEntityType): ScanStateResponse | null => {
        return duplicateScanProgress[entityType] || null;
    }, [duplicateScanProgress]);

    return (
        <JobContext.Provider value={{
            backfillProgress,
            genreUpdateProgress,
            duplicateScanProgress,
            isBackfillRunning: backfillProgress?.is_running || false,
            isGenreUpdateRunning: genreUpdateProgress?.is_running || false,
            isDuplicateScanRunning,
            isAnyDuplicateScanRunning,
            getScanProgress,
            refreshProgress: fetchProgress
        }}>
            {children}
        </JobContext.Provider>
    );
}

export function useJobs() {
    const context = useContext(JobContext);
    if (context === undefined) {
        throw new Error('useJobs must be used within a JobProvider');
    }
    return context;
}
