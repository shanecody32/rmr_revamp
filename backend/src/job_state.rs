use sea_orm::DatabaseConnection;
use std::collections::HashMap;
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
    /// Per-entity-type scan running flags (keyed by entity_type string e.g. "bands", "albums")
    pub duplicate_scans_running: Arc<RwLock<HashMap<String, bool>>>,
    pub static_config: StaticFileConfig,
    pub http_client: reqwest::Client,
}

impl AppState {
    /// Check if any duplicate scan is currently running
    pub async fn is_any_scan_running(&self) -> bool {
        let map = self.duplicate_scans_running.read().await;
        map.values().any(|&v| v)
    }

    /// Set the running flag for a specific entity type
    pub async fn set_scan_running(&self, entity_type: &str, running: bool) {
        let mut map = self.duplicate_scans_running.write().await;
        map.insert(entity_type.to_string(), running);
    }

    /// Check if a specific entity type scan is running
    pub async fn is_scan_running(&self, entity_type: &str) -> bool {
        let map = self.duplicate_scans_running.read().await;
        map.get(entity_type).copied().unwrap_or(false)
    }
}
