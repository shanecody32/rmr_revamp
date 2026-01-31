use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post, put},
    Json, Router,
};
use crate::job_state::AppState;
use crate::models::band_duplicate_candidates::CandidateStatus;
use crate::services::duplicate_scan_service::{
    CandidateFilterParams, DuplicateCandidateResponse, DuplicateScanService,
    GroupedDuplicateResponse, ScanStateResponse, StartScanRequest,
};
use crate::services::types::PaginatedResponse;
use crate::utils::error::handle_internal_error;
use serde::Deserialize;
use utoipa::ToSchema;
use sea_orm::DbErr;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/state", get(get_scan_state))
        .route("/start", post(start_scan))
        .route("/stop", post(stop_scan))
        .route("/clear", post(clear_candidates))
        .route("/candidates", get(get_candidates))
        .route("/candidates/grouped", get(get_candidates_grouped))
        .route("/candidates/{id}", put(update_candidate_status))
        .route("/candidates/{id}/restore", put(restore_candidate))
        .route("/bands/{id}/matches", get(get_band_matches))
}

#[utoipa::path(
    get,
    path = "/duplicate-scan/state",
    responses(
        (status = 200, description = "Current scan state", body = ScanStateResponse),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn get_scan_state(State(state): State<AppState>) -> impl IntoResponse {
    match DuplicateScanService::get_scan_state(&state.db).await {
        Ok(scan_state) => (StatusCode::OK, Json(scan_state)).into_response(),
        Err(e) => handle_internal_error(e),
    }
}

#[utoipa::path(
    post,
    path = "/duplicate-scan/start",
    request_body = StartScanRequest,
    responses(
        (status = 202, description = "Scan started in background", body = ScanStateResponse),
        (status = 400, description = "Scan already running"),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn start_scan(
    State(state): State<AppState>,
    Json(request): Json<StartScanRequest>,
) -> impl IntoResponse {
    match DuplicateScanService::start_scan(&state.db, request).await {
        Ok(scan_state) => {
            tracing::info!("Duplicate scan job requested to start");
            let db = state.db.clone();
            tokio::spawn(async move {
                if let Err(e) = DuplicateScanService::run_scan_background(db).await {
                    tracing::error!("Duplicate scan background job failed: {}", e);
                }
            });
            (StatusCode::ACCEPTED, Json(scan_state)).into_response()
        }
        Err(DbErr::Custom(msg)) if msg.contains("already running") => {
            (StatusCode::BAD_REQUEST, msg).into_response()
        }
        Err(e) => handle_internal_error(e),
    }
}

#[utoipa::path(
    post,
    path = "/duplicate-scan/stop",
    responses(
        (status = 200, description = "Scan stopped", body = ScanStateResponse),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn stop_scan(State(state): State<AppState>) -> impl IntoResponse {
    match DuplicateScanService::stop_scan(&state.db).await {
        Ok(scan_state) => (StatusCode::OK, Json(scan_state)).into_response(),
        Err(e) => handle_internal_error(e),
    }
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct ClearCandidatesRequest {
    pub pending_only: Option<bool>,
}

#[utoipa::path(
    post,
    path = "/duplicate-scan/clear",
    responses(
        (status = 200, description = "Candidates cleared"),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn clear_candidates(
    State(state): State<AppState>,
    Json(request): Json<ClearCandidatesRequest>,
) -> impl IntoResponse {
    match DuplicateScanService::clear_candidates(&state.db, request.pending_only.unwrap_or(false))
        .await
    {
        Ok(count) => (
            StatusCode::OK,
            Json(serde_json::json!({ "deleted": count })),
        )
            .into_response(),
        Err(e) => handle_internal_error(e),
    }
}

#[utoipa::path(
    get,
    path = "/duplicate-scan/candidates",
    params(CandidateFilterParams),
    responses(
        (status = 200, description = "List of candidates", body = PaginatedResponse<DuplicateCandidateResponse>),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn get_candidates(
    State(state): State<AppState>,
    Query(params): Query<CandidateFilterParams>,
) -> impl IntoResponse {
    match DuplicateScanService::get_candidates(&state.db, params).await {
        Ok(paginated) => (StatusCode::OK, Json(paginated)).into_response(),
        Err(e) => handle_internal_error(e),
    }
}

#[utoipa::path(
    get,
    path = "/duplicate-scan/candidates/grouped",
    params(CandidateFilterParams),
    responses(
        (status = 200, description = "Grouped candidates", body = PaginatedResponse<GroupedDuplicateResponse>),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn get_candidates_grouped(
    State(state): State<AppState>,
    Query(params): Query<CandidateFilterParams>,
) -> impl IntoResponse {
    match DuplicateScanService::get_candidates_grouped(&state.db, params).await {
        Ok(paginated) => (StatusCode::OK, Json(paginated)).into_response(),
        Err(e) => handle_internal_error(e),
    }
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct UpdateStatusRequest {
    pub status: String,
    pub user_id: Option<u32>,
}

#[utoipa::path(
    put,
    path = "/duplicate-scan/candidates/{id}",
    params(
        ("id" = u32, Path, description = "Candidate ID")
    ),
    request_body = UpdateStatusRequest,
    responses(
        (status = 200, description = "Status updated"),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn update_candidate_status(
    State(state): State<AppState>,
    Path(id): Path<u32>,
    Json(request): Json<UpdateStatusRequest>,
) -> impl IntoResponse {
    let status = CandidateStatus::from(request.status.as_str());
    match DuplicateScanService::update_candidate_status(&state.db, id, status, request.user_id)
        .await
    {
        Ok(candidate) => (StatusCode::OK, Json(candidate)).into_response(),
        Err(e) => handle_internal_error(e),
    }
}

#[utoipa::path(
    put,
    path = "/duplicate-scan/candidates/{id}/restore",
    params(
        ("id" = u32, Path, description = "Candidate ID")
    ),
    responses(
        (status = 200, description = "Candidate restored to pending"),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn restore_candidate(
    State(state): State<AppState>,
    Path(id): Path<u32>,
) -> impl IntoResponse {
    match DuplicateScanService::restore_candidate(&state.db, id).await {
        Ok(candidate) => (StatusCode::OK, Json(candidate)).into_response(),
        Err(e) => handle_internal_error(e),
    }
}

#[utoipa::path(
    get,
    path = "/duplicate-scan/bands/{id}/matches",
    params(
        ("id" = u32, Path, description = "Band ID")
    ),
    responses(
        (status = 200, description = "Band matches", body = [DuplicateCandidateResponse]),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn get_band_matches(
    State(state): State<AppState>,
    Path(id): Path<u32>,
) -> impl IntoResponse {
    match DuplicateScanService::get_band_matches(&state.db, id).await {
        Ok(matches) => (StatusCode::OK, Json(matches)).into_response(),
        Err(e) => handle_internal_error(e),
    }
}
