'use client'

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { systemApi } from '@/lib/api/system';
import type { BackfillJobState, TaskJobState } from '@/types/api/system';
import { getScanState, type ScanStateResponse } from '@/lib/api/duplicateScan';
import { useToast } from '@/hooks/ui/use-toast';

interface JobContextType {
    backfillProgress: BackfillJobState | null;
    genreUpdateProgress: TaskJobState | null;
    duplicateScanProgress: ScanStateResponse | null;
    isBackfillRunning: boolean;
    isGenreUpdateRunning: boolean;
    isDuplicateScanRunning: boolean;
    refreshProgress: () => Promise<void>;
}

const JobContext = createContext<JobContextType | undefined>(undefined);

export function JobProvider({ children }: { children: React.ReactNode }) {
    const [backfillProgress, setBackfillProgress] = useState<BackfillJobState | null>(null);
    const [genreUpdateProgress, setGenreUpdateProgress] = useState<TaskJobState | null>(null);
    const [duplicateScanProgress, setDuplicateScanProgress] = useState<ScanStateResponse | null>(null);
    const { toast } = useToast();

    const prevBackfillRunning = useRef<boolean>(false);
    const prevGenreRunning = useRef<boolean>(false);
    const prevDupScanRunning = useRef<boolean>(false);
    const isInitialMount = useRef<boolean>(true);

    const fetchProgress = async () => {
        try {
            const [backfillData, genreData, dupScanData] = await Promise.all([
                systemApi.getBackfillProgress(),
                systemApi.getAlbumGenreUpdateProgress(),
                getScanState().catch(() => null),
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

                // Check for duplicate scan completion
                if (dupScanData && prevDupScanRunning.current && !dupScanData.is_running) {
                    if (dupScanData.last_error) {
                        toast({
                            variant: 'destructive',
                            title: 'Duplicate Scan Failed',
                            description: dupScanData.last_error,
                            duration: 10
                        });
                    } else {
                        toast({
                            title: 'Duplicate Scan Complete',
                            description: `Scan finished. ${dupScanData.duplicates_found} duplicates found.`,
                            duration: 10
                        });
                    }
                }
            }

            setBackfillProgress(backfillData);
            setGenreUpdateProgress(genreData);
            if (dupScanData) {
                setDuplicateScanProgress(dupScanData);
                prevDupScanRunning.current = dupScanData.is_running;
            }
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
                    duplicate_scan: ScanStateResponse | null;
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

                    // Check for duplicate scan completion
                    if (data.duplicate_scan && prevDupScanRunning.current && !data.duplicate_scan.is_running) {
                        if (data.duplicate_scan.last_error) {
                            toast({
                                variant: 'destructive',
                                title: 'Duplicate Scan Failed',
                                description: data.duplicate_scan.last_error,
                                duration: 10
                            });
                        } else {
                            toast({
                                title: 'Duplicate Scan Complete',
                                description: `Scan finished. ${data.duplicate_scan.duplicates_found} duplicates found.`,
                                duration: 10
                            });
                        }
                    }
                }

                setBackfillProgress(data.backfill);
                setGenreUpdateProgress(data.genre_update);
                if (data.duplicate_scan) {
                    setDuplicateScanProgress(data.duplicate_scan);
                    prevDupScanRunning.current = data.duplicate_scan.is_running;
                }
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

    return (
        <JobContext.Provider value={{
            backfillProgress,
            genreUpdateProgress,
            duplicateScanProgress,
            isBackfillRunning: backfillProgress?.is_running || false,
            isGenreUpdateRunning: genreUpdateProgress?.is_running || false,
            isDuplicateScanRunning: duplicateScanProgress?.is_running || false,
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
