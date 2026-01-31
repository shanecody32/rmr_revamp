export interface EntityJobState {
    entity: string;
    processed: number;
    total: number;
    completed: boolean;
    error?: string;
}

export interface BackfillJobState {
    is_running: boolean;
    overall_progress: number;
    current_entity: string;
    entities: EntityJobState[];
    last_error?: string;
    last_started_at?: string;
    last_finished_at?: string;
}

export interface TaskJobState {
    is_running: boolean;
    overall_progress: number;
    current_item?: string;
    processed: number;
    total: number;
    last_error?: string;
    last_started_at?: string;
    last_finished_at?: string;
}
