use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post, put},
    Json, Router,
};
use sea_orm::DbErr;
use crate::views::ApiError;
use crate::job_state::AppState;
use crate::models::band_duplicate_candidates::CandidateStatus;
use crate::models::duplicate_scan_state::ScanEntityType;
use crate::services::duplicate_scan_service::{
    CandidateFilterParams, DuplicateScanService,
    GroupedDuplicateResponse, ScanStateResponse, StartScanRequest,
};
use crate::services::types::PaginatedResponse;
use serde::Deserialize;
use utoipa::ToSchema;
use tokio_util::sync::CancellationToken;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/summary", get(get_summary))
        // Entity-type-parameterized routes
        .route("/{entity_type}/state", get(get_scan_state))
        .route("/{entity_type}/start", post(start_scan))
        .route("/{entity_type}/stop", post(stop_scan))
        .route("/{entity_type}/clear", post(clear_candidates))
        .route("/{entity_type}/candidates/grouped", get(get_candidates_grouped))
        .route("/{entity_type}/candidates/{id}", put(update_candidate_status))
        .route("/{entity_type}/candidates/{id}/restore", put(restore_candidate))
        .route("/{entity_type}/entities/{id}/matches", get(get_entity_matches))
}

fn parse_entity_type(entity_type: &str) -> Result<ScanEntityType, (StatusCode, String)> {
    entity_type
        .parse::<ScanEntityType>()
        .map_err(|e| (StatusCode::BAD_REQUEST, e))
}

#[utoipa::path(
    get,
    path = "/duplicate-scan/{entity_type}/state",
    params(
        ("entity_type" = String, Path, description = "Entity type (bands, albums, labels, radio_stations, staff_members)")
    ),
    responses(
        (status = 200, description = "Current scan state", body = ScanStateResponse),
        (status = 400, description = "Invalid entity type"),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn get_scan_state(
    State(state): State<AppState>,
    Path(entity_type): Path<String>,
) -> impl IntoResponse {
    let et = match parse_entity_type(&entity_type) {
        Ok(et) => et,
        Err((code, msg)) => return (code, msg).into_response(),
    };
    match DuplicateScanService::get_scan_state(&state.db, &et).await {
        Ok(scan_state) => (StatusCode::OK, Json(scan_state)).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

#[utoipa::path(
    post,
    path = "/duplicate-scan/{entity_type}/start",
    params(
        ("entity_type" = String, Path, description = "Entity type")
    ),
    request_body = StartScanRequest,
    responses(
        (status = 202, description = "Scan started in background", body = ScanStateResponse),
        (status = 400, description = "Scan already running or invalid entity type"),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn start_scan(
    State(state): State<AppState>,
    Path(entity_type): Path<String>,
    Json(request): Json<StartScanRequest>,
) -> impl IntoResponse {
    let et = match parse_entity_type(&entity_type) {
        Ok(et) => et,
        Err((code, msg)) => return (code, msg).into_response(),
    };
    match DuplicateScanService::start_scan(&state.db, &et, request).await {
        Ok(scan_state) => {
            tracing::info!("Duplicate scan job requested to start for {}", et.display_name());
            state.set_scan_running(&et.to_string(), true).await;

            // Create a cancellation token for this scan
            let token = CancellationToken::new();
            {
                let mut tokens = state.duplicate_scan_tokens.write().await;
                tokens.insert(et.to_string(), token.clone());
            }

            let db = state.db.clone();
            let scans_running = state.duplicate_scans_running.clone();
            let scan_tokens = state.duplicate_scan_tokens.clone();
            let et_string = et.to_string();
            tokio::spawn(async move {
                if let Err(e) = DuplicateScanService::run_scan_background(db, et, token).await {
                    tracing::error!("Duplicate scan background job failed: {}", e);
                }
                let mut map = scans_running.write().await;
                map.insert(et_string.clone(), false);
                // Clean up the token
                let mut tokens = scan_tokens.write().await;
                tokens.remove(&et_string);
            });
            (StatusCode::ACCEPTED, Json(scan_state)).into_response()
        }
        Err(DbErr::Custom(msg)) if msg.contains("already running") => {
            (StatusCode::BAD_REQUEST, msg).into_response()
        }
        Err(e) => ApiError::from(e).into_response(),
    }
}

#[utoipa::path(
    post,
    path = "/duplicate-scan/{entity_type}/stop",
    params(
        ("entity_type" = String, Path, description = "Entity type")
    ),
    responses(
        (status = 200, description = "Scan stopped", body = ScanStateResponse),
        (status = 400, description = "Invalid entity type"),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn stop_scan(
    State(state): State<AppState>,
    Path(entity_type): Path<String>,
) -> impl IntoResponse {
    let et = match parse_entity_type(&entity_type) {
        Ok(et) => et,
        Err((code, msg)) => return (code, msg).into_response(),
    };
    // Cancel the token to signal the background task immediately
    {
        let tokens = state.duplicate_scan_tokens.read().await;
        if let Some(token) = tokens.get(&et.to_string()) {
            token.cancel();
        }
    }

    match DuplicateScanService::stop_scan(&state.db, &et).await {
        Ok(scan_state) => {
            state.set_scan_running(&et.to_string(), false).await;
            (StatusCode::OK, Json(scan_state)).into_response()
        }
        Err(e) => ApiError::from(e).into_response(),
    }
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct ClearCandidatesRequest {
    pub pending_only: Option<bool>,
}

#[utoipa::path(
    post,
    path = "/duplicate-scan/{entity_type}/clear",
    params(
        ("entity_type" = String, Path, description = "Entity type")
    ),
    responses(
        (status = 200, description = "Candidates cleared"),
        (status = 400, description = "Invalid entity type"),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn clear_candidates(
    State(state): State<AppState>,
    Path(entity_type): Path<String>,
    Json(request): Json<ClearCandidatesRequest>,
) -> impl IntoResponse {
    let et = match parse_entity_type(&entity_type) {
        Ok(et) => et,
        Err((code, msg)) => return (code, msg).into_response(),
    };
    match DuplicateScanService::clear_candidates(&state.db, &et, request.pending_only.unwrap_or(false))
        .await
    {
        Ok(count) => (
            StatusCode::OK,
            Json(serde_json::json!({ "deleted": count })),
        )
            .into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

#[utoipa::path(
    get,
    path = "/duplicate-scan/{entity_type}/candidates/grouped",
    params(
        ("entity_type" = String, Path, description = "Entity type"),
        CandidateFilterParams
    ),
    responses(
        (status = 200, description = "Grouped candidates", body = PaginatedResponse<GroupedDuplicateResponse>),
        (status = 400, description = "Invalid entity type"),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn get_candidates_grouped(
    State(state): State<AppState>,
    Path(entity_type): Path<String>,
    Query(params): Query<CandidateFilterParams>,
) -> impl IntoResponse {
    let et = match parse_entity_type(&entity_type) {
        Ok(et) => et,
        Err((code, msg)) => return (code, msg).into_response(),
    };
    match DuplicateScanService::get_candidates_grouped(&state.db, &et, params).await {
        Ok(paginated) => (StatusCode::OK, Json(paginated)).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct UpdateStatusRequest {
    pub status: String,
    pub user_id: Option<u32>,
}

#[utoipa::path(
    put,
    path = "/duplicate-scan/{entity_type}/candidates/{id}",
    params(
        ("entity_type" = String, Path, description = "Entity type"),
        ("id" = u32, Path, description = "Candidate ID")
    ),
    request_body = UpdateStatusRequest,
    responses(
        (status = 200, description = "Status updated"),
        (status = 400, description = "Invalid entity type"),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn update_candidate_status(
    State(state): State<AppState>,
    Path((entity_type, id)): Path<(String, u32)>,
    Json(request): Json<UpdateStatusRequest>,
) -> impl IntoResponse {
    let et = match parse_entity_type(&entity_type) {
        Ok(et) => et,
        Err((code, msg)) => return (code, msg).into_response(),
    };
    let status = CandidateStatus::from(request.status.as_str());
    match DuplicateScanService::update_candidate_status(&state.db, &et, id, status, request.user_id)
        .await
    {
        Ok(()) => (StatusCode::OK, Json(serde_json::json!({"ok": true}))).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

#[utoipa::path(
    put,
    path = "/duplicate-scan/{entity_type}/candidates/{id}/restore",
    params(
        ("entity_type" = String, Path, description = "Entity type"),
        ("id" = u32, Path, description = "Candidate ID")
    ),
    responses(
        (status = 200, description = "Candidate restored to pending"),
        (status = 400, description = "Invalid entity type"),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn restore_candidate(
    State(state): State<AppState>,
    Path((entity_type, id)): Path<(String, u32)>,
) -> impl IntoResponse {
    let et = match parse_entity_type(&entity_type) {
        Ok(et) => et,
        Err((code, msg)) => return (code, msg).into_response(),
    };
    match DuplicateScanService::restore_candidate(&state.db, &et, id).await {
        Ok(()) => (StatusCode::OK, Json(serde_json::json!({"ok": true}))).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

#[utoipa::path(
    get,
    path = "/duplicate-scan/{entity_type}/entities/{id}/matches",
    params(
        ("entity_type" = String, Path, description = "Entity type"),
        ("id" = u32, Path, description = "Entity ID")
    ),
    responses(
        (status = 200, description = "Entity matches"),
        (status = 400, description = "Invalid entity type"),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn get_entity_matches(
    State(state): State<AppState>,
    Path((entity_type, id)): Path<(String, u32)>,
) -> impl IntoResponse {
    let et = match parse_entity_type(&entity_type) {
        Ok(et) => et,
        Err((code, msg)) => return (code, msg).into_response(),
    };
    match DuplicateScanService::get_entity_matches(&state.db, &et, id).await {
        Ok(matches) => (StatusCode::OK, Json(matches)).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

#[utoipa::path(
    get,
    path = "/duplicate-scan/summary",
    responses(
        (status = 200, description = "Pending counts per entity type"),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn get_summary(
    State(state): State<AppState>,
) -> impl IntoResponse {
    match DuplicateScanService::get_pending_summary(&state.db).await {
        Ok(summary) => (StatusCode::OK, Json(summary)).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}
