use sea_orm::DatabaseConnection;
use std::sync::Arc;
use tokio::sync::RwLock;
use serde::Serialize;
use utoipa::ToSchema;
use chrono::{DateTime, Utc};

use crate::config::StaticFileConfig;

#[derive(Clone, Debug, Serialize, Default, ToSchema)]
pub struct EntityJobState {
    pub entity: String,
    pub processed: i32,
    pub total: i32,
    pub completed: bool,
    pub error: Option<String>,
}

#[derive(Clone, Debug, Serialize, Default, ToSchema)]
pub struct BackfillJobState {
    pub is_running: bool,
    pub overall_progress: f32, // 0.0 to 100.0
    pub current_entity: String,
    pub entities: Vec<EntityJobState>,
    pub last_error: Option<String>,
    pub last_started_at: Option<DateTime<Utc>>,
    pub last_finished_at: Option<DateTime<Utc>>,
}

#[derive(Clone, Debug, Serialize, Default, ToSchema)]
pub struct TaskJobState {
    pub is_running: bool,
    pub overall_progress: f32, // 0.0 to 100.0
    pub current_item: Option<String>,
    pub processed: i32,
    pub total: i32,
    pub last_error: Option<String>,
    pub last_started_at: Option<DateTime<Utc>>,
    pub last_finished_at: Option<DateTime<Utc>>,
}

#[derive(Clone)]
pub struct AppState {
    pub db: DatabaseConnection,
    pub backfill_job_state: Arc<RwLock<BackfillJobState>>,
    pub album_genre_update_job_state: Arc<RwLock<TaskJobState>>,
    pub duplicate_scan_running: Arc<RwLock<bool>>,
    pub static_config: StaticFileConfig,
    pub http_client: reqwest::Client,
}
