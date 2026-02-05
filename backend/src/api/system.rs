use axum::{
    extract::State,
    http::StatusCode,
    response::{sse::{Event, KeepAlive, Sse}, IntoResponse},
    routing::{get, post},
    Json, Router,
};
use futures_util::Stream;
use std::convert::Infallible;
use std::time::Duration;
use tokio_stream::StreamExt;
use tokio_stream::wrappers::IntervalStream;
use crate::job_state::{AppState, BackfillJobState, TaskJobState};
use crate::utils::similarity::backfill_aliases;
use crate::services::AlbumService;
use crate::services::duplicate_scan_service::{DuplicateScanService, ScanStateResponse};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/backfill-similarity", post(trigger_backfill))
        .route("/backfill-progress", get(get_backfill_progress))
        .route("/update-album-genres", post(trigger_album_genre_update))
        .route("/update-album-genres-progress", get(get_album_genre_update_progress))
        .route("/jobs/stream", get(job_stream))
}

#[utoipa::path(
    post,
    path = "/system/backfill-similarity",
    responses(
        (status = 202, description = "Backfill started in background"),
        (status = 409, description = "Backfill is already running"),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn trigger_backfill(State(state): State<AppState>) -> impl IntoResponse {
    let is_running = state.backfill_job_state.read().await.is_running;
    if is_running {
        return (StatusCode::CONFLICT, "Backfill is already running").into_response();
    }

    tracing::info!("Backfill similarity job requested to start");
    let state_clone = state.clone();
    tokio::spawn(async move {
        let job_state = state_clone.backfill_job_state.clone();
        if let Err(e) = backfill_aliases(&state_clone.db, job_state.clone()).await {
            tracing::error!("Backfill failed: {}", e);
            let mut p = job_state.write().await;
            p.is_running = false;
            p.last_error = Some(format!("Fatal error: {}", e));
            p.last_finished_at = Some(chrono::Utc::now());
        }
    });

    (StatusCode::ACCEPTED, "Backfill started in background").into_response()
}

#[utoipa::path(
    get,
    path = "/system/backfill-progress",
    responses(
        (status = 200, description = "Current backfill progress", body = BackfillJobState),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn get_backfill_progress(State(state): State<AppState>) -> impl IntoResponse {
    let progress = state.backfill_job_state.read().await;
    (StatusCode::OK, Json(progress.clone())).into_response()
}

#[utoipa::path(
    post,
    path = "/system/update-album-genres",
    responses(
        (status = 202, description = "Album genre update started in background"),
        (status = 409, description = "Task is already running"),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn trigger_album_genre_update(State(state): State<AppState>) -> impl IntoResponse {
    let is_running = state.album_genre_update_job_state.read().await.is_running;
    if is_running {
        return (StatusCode::CONFLICT, "Task is already running").into_response();
    }

    tracing::info!("Album genre update job requested to start");
    let state_clone = state.clone();
    tokio::spawn(async move {
        let job_state = state_clone.album_genre_update_job_state.clone();
        if let Err(e) = AlbumService::run_album_genre_update_background_batched(state_clone.db, job_state.clone()).await {
            tracing::error!("Album genre update failed: {}", e);
            let mut p = job_state.write().await;
            p.is_running = false;
            p.last_error = Some(format!("Fatal error: {}", e));
            p.last_finished_at = Some(chrono::Utc::now());
        }
    });

    (StatusCode::ACCEPTED, "Album genre update started in background").into_response()
}

#[utoipa::path(
    get,
    path = "/system/update-album-genres-progress",
    responses(
        (status = 200, description = "Current album genre update progress", body = TaskJobState),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn get_album_genre_update_progress(State(state): State<AppState>) -> impl IntoResponse {
    let progress = state.album_genre_update_job_state.read().await;
    (StatusCode::OK, Json(progress.clone())).into_response()
}

#[derive(serde::Serialize)]
struct JobStreamPayload {
    backfill: BackfillJobState,
    genre_update: TaskJobState,
    /// Multiple scan states (one per running entity type)
    duplicate_scans: Vec<ScanStateResponse>,
}

pub(crate) async fn job_stream(
    State(state): State<AppState>,
) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    // Do one initial DB fetch for all scan states
    let initial_scans = DuplicateScanService::get_all_running_scan_states(&state.db)
        .await
        .unwrap_or_default();
    let is_first = std::sync::Arc::new(tokio::sync::Mutex::new(true));

    let stream = IntervalStream::new(tokio::time::interval(Duration::from_secs(2)))
        .then(move |_| {
            let state = state.clone();
            let initial_scans = initial_scans.clone();
            let is_first = is_first.clone();
            async move {
                let backfill = state.backfill_job_state.read().await.clone();
                let genre_update = state.album_genre_update_job_state.read().await.clone();

                let mut first = is_first.lock().await;
                let duplicate_scans = if *first {
                    *first = false;
                    initial_scans
                } else {
                    let any_running = state.is_any_scan_running().await;
                    if any_running {
                        DuplicateScanService::get_all_running_scan_states(&state.db)
                            .await
                            .unwrap_or_default()
                    } else {
                        vec![]
                    }
                };

                let payload = JobStreamPayload { backfill, genre_update, duplicate_scans };
                let json = serde_json::to_string(&payload).unwrap_or_default();
                Ok::<_, Infallible>(Event::default().data(json))
            }
        });

    Sse::new(stream).keep_alive(KeepAlive::new().interval(Duration::from_secs(15)))
}
