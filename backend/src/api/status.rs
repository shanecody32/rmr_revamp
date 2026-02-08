//! Status API endpoints for managing entity data and chart statuses.

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, put},
    Json, Router,
};
use crate::views::ApiError;
use crate::job_state::AppState;
use crate::services::status_service::{
    StatusService, DataStatusUpdate, ChartStatusUpdate, StatusUpdateResult,
};
use crate::services::action_log_service::ActionLogService;
use crate::models::action_logs::entity_types;

pub fn router() -> Router<AppState> {
    Router::new()
        // Band status endpoints
        .route("/bands/{id}/data-status", put(update_band_data_status))
        .route("/bands/{id}/chart-status", put(update_band_chart_status))
        .route("/bands/{id}/status-history", get(get_band_status_history))
        // Album status endpoints
        .route("/albums/{id}/data-status", put(update_album_data_status))
        .route("/albums/{id}/chart-status", put(update_album_chart_status))
        .route("/albums/{id}/status-history", get(get_album_status_history))
        // Song status endpoints
        .route("/songs/{id}/data-status", put(update_song_data_status))
        .route("/songs/{id}/chart-status", put(update_song_chart_status))
        .route("/songs/{id}/status-history", get(get_song_status_history))
        // Radio station status endpoints
        .route("/radio-stations/{id}/data-status", put(update_radio_station_data_status))
        .route("/radio-stations/{id}/chart-status", put(update_radio_station_chart_status))
        .route("/radio-stations/{id}/status-history", get(get_radio_station_status_history))
        // Staff member status endpoints
        .route("/staff-members/{id}/data-status", put(update_staff_data_status))
        .route("/staff-members/{id}/chart-status", put(update_staff_chart_status))
        .route("/staff-members/{id}/status-history", get(get_staff_status_history))
}

// ========== Band Status Endpoints ==========

#[utoipa::path(
    put,
    path = "/status/bands/{id}/data-status",
    params(
        ("id" = u32, Path, description = "Band ID")
    ),
    request_body = DataStatusUpdate,
    responses(
        (status = 200, description = "Status updated", body = StatusUpdateResult),
        (status = 404, description = "Band not found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn update_band_data_status(
    State(state): State<AppState>,
    Path(band_id): Path<u32>,
    Json(update): Json<DataStatusUpdate>,
) -> impl IntoResponse {
    let user_id: Option<u32> = None;
    let ip_address: Option<String> = None;

    match StatusService::update_band_data_status(&state.db, band_id, update, user_id, ip_address).await {
        Ok(result) => (StatusCode::OK, Json(result)).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

#[utoipa::path(
    put,
    path = "/status/bands/{id}/chart-status",
    params(
        ("id" = u32, Path, description = "Band ID")
    ),
    request_body = ChartStatusUpdate,
    responses(
        (status = 200, description = "Status updated", body = StatusUpdateResult),
        (status = 400, description = "Cannot approve with duplicate status"),
        (status = 404, description = "Band not found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn update_band_chart_status(
    State(state): State<AppState>,
    Path(band_id): Path<u32>,
    Json(update): Json<ChartStatusUpdate>,
) -> impl IntoResponse {
    let user_id: Option<u32> = None;
    let ip_address: Option<String> = None;

    match StatusService::update_band_chart_status(&state.db, band_id, update, user_id, ip_address).await {
        Ok(result) => (StatusCode::OK, Json(result)).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

#[utoipa::path(
    get,
    path = "/status/bands/{id}/status-history",
    params(
        ("id" = u32, Path, description = "Band ID")
    ),
    responses(
        (status = 200, description = "Status history"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_band_status_history(
    State(state): State<AppState>,
    Path(band_id): Path<u32>,
) -> impl IntoResponse {
    match ActionLogService::get_logs_for_entity(&state.db, entity_types::BAND, band_id, 50).await {
        Ok(logs) => (StatusCode::OK, Json(logs)).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

// ========== Album Status Endpoints ==========

#[utoipa::path(
    put,
    path = "/status/albums/{id}/data-status",
    params(
        ("id" = u32, Path, description = "Album ID")
    ),
    request_body = DataStatusUpdate,
    responses(
        (status = 200, description = "Status updated", body = StatusUpdateResult),
        (status = 404, description = "Album not found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn update_album_data_status(
    State(state): State<AppState>,
    Path(album_id): Path<u32>,
    Json(update): Json<DataStatusUpdate>,
) -> impl IntoResponse {
    let user_id: Option<u32> = None;
    let ip_address: Option<String> = None;

    match StatusService::update_album_data_status(&state.db, album_id, update, user_id, ip_address).await {
        Ok(result) => (StatusCode::OK, Json(result)).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

#[utoipa::path(
    put,
    path = "/status/albums/{id}/chart-status",
    params(
        ("id" = u32, Path, description = "Album ID")
    ),
    request_body = ChartStatusUpdate,
    responses(
        (status = 200, description = "Status updated", body = StatusUpdateResult),
        (status = 400, description = "Cannot approve with duplicate status"),
        (status = 404, description = "Album not found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn update_album_chart_status(
    State(state): State<AppState>,
    Path(album_id): Path<u32>,
    Json(update): Json<ChartStatusUpdate>,
) -> impl IntoResponse {
    let user_id: Option<u32> = None;
    let ip_address: Option<String> = None;

    match StatusService::update_album_chart_status(&state.db, album_id, update, user_id, ip_address).await {
        Ok(result) => (StatusCode::OK, Json(result)).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

#[utoipa::path(
    get,
    path = "/status/albums/{id}/status-history",
    params(
        ("id" = u32, Path, description = "Album ID")
    ),
    responses(
        (status = 200, description = "Status history"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_album_status_history(
    State(state): State<AppState>,
    Path(album_id): Path<u32>,
) -> impl IntoResponse {
    match ActionLogService::get_logs_for_entity(&state.db, entity_types::ALBUM, album_id, 50).await {
        Ok(logs) => (StatusCode::OK, Json(logs)).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

// ========== Song Status Endpoints ==========

#[utoipa::path(
    put,
    path = "/status/songs/{id}/data-status",
    params(
        ("id" = u32, Path, description = "Song ID")
    ),
    request_body = DataStatusUpdate,
    responses(
        (status = 200, description = "Status updated", body = StatusUpdateResult),
        (status = 404, description = "Song not found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn update_song_data_status(
    State(state): State<AppState>,
    Path(song_id): Path<u32>,
    Json(update): Json<DataStatusUpdate>,
) -> impl IntoResponse {
    let user_id: Option<u32> = None;
    let ip_address: Option<String> = None;

    match StatusService::update_song_data_status(&state.db, song_id, update, user_id, ip_address).await {
        Ok(result) => (StatusCode::OK, Json(result)).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

#[utoipa::path(
    put,
    path = "/status/songs/{id}/chart-status",
    params(
        ("id" = u32, Path, description = "Song ID")
    ),
    request_body = ChartStatusUpdate,
    responses(
        (status = 200, description = "Status updated", body = StatusUpdateResult),
        (status = 400, description = "Cannot approve with duplicate status"),
        (status = 404, description = "Song not found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn update_song_chart_status(
    State(state): State<AppState>,
    Path(song_id): Path<u32>,
    Json(update): Json<ChartStatusUpdate>,
) -> impl IntoResponse {
    let user_id: Option<u32> = None;
    let ip_address: Option<String> = None;

    match StatusService::update_song_chart_status(&state.db, song_id, update, user_id, ip_address).await {
        Ok(result) => (StatusCode::OK, Json(result)).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

#[utoipa::path(
    get,
    path = "/status/songs/{id}/status-history",
    params(
        ("id" = u32, Path, description = "Song ID")
    ),
    responses(
        (status = 200, description = "Status history"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_song_status_history(
    State(state): State<AppState>,
    Path(song_id): Path<u32>,
) -> impl IntoResponse {
    match ActionLogService::get_logs_for_entity(&state.db, entity_types::SONG, song_id, 50).await {
        Ok(logs) => (StatusCode::OK, Json(logs)).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

// ========== Radio Station Status Endpoints ==========

#[utoipa::path(
    put,
    path = "/status/radio-stations/{id}/data-status",
    params(
        ("id" = u32, Path, description = "Radio Station ID")
    ),
    request_body = DataStatusUpdate,
    responses(
        (status = 200, description = "Status updated", body = StatusUpdateResult),
        (status = 404, description = "Radio station not found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn update_radio_station_data_status(
    State(state): State<AppState>,
    Path(station_id): Path<u32>,
    Json(update): Json<DataStatusUpdate>,
) -> impl IntoResponse {
    let user_id: Option<u32> = None;
    let ip_address: Option<String> = None;

    match StatusService::update_radio_station_data_status(&state.db, station_id, update, user_id, ip_address).await {
        Ok(result) => (StatusCode::OK, Json(result)).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

#[utoipa::path(
    put,
    path = "/status/radio-stations/{id}/chart-status",
    params(
        ("id" = u32, Path, description = "Radio Station ID")
    ),
    request_body = ChartStatusUpdate,
    responses(
        (status = 200, description = "Status updated", body = StatusUpdateResult),
        (status = 400, description = "Cannot approve with duplicate status"),
        (status = 404, description = "Radio station not found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn update_radio_station_chart_status(
    State(state): State<AppState>,
    Path(station_id): Path<u32>,
    Json(update): Json<ChartStatusUpdate>,
) -> impl IntoResponse {
    let user_id: Option<u32> = None;
    let ip_address: Option<String> = None;

    match StatusService::update_radio_station_chart_status(&state.db, station_id, update, user_id, ip_address).await {
        Ok(result) => (StatusCode::OK, Json(result)).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

#[utoipa::path(
    get,
    path = "/status/radio-stations/{id}/status-history",
    params(
        ("id" = u32, Path, description = "Radio Station ID")
    ),
    responses(
        (status = 200, description = "Status history"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_radio_station_status_history(
    State(state): State<AppState>,
    Path(station_id): Path<u32>,
) -> impl IntoResponse {
    match ActionLogService::get_logs_for_entity(&state.db, entity_types::RADIO_STATION, station_id, 50).await {
        Ok(logs) => (StatusCode::OK, Json(logs)).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

// ========== Staff Member Status Endpoints ==========

#[utoipa::path(
    put,
    path = "/status/staff-members/{id}/data-status",
    params(
        ("id" = u32, Path, description = "Staff Member ID")
    ),
    request_body = DataStatusUpdate,
    responses(
        (status = 200, description = "Status updated", body = StatusUpdateResult),
        (status = 404, description = "Staff member not found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn update_staff_data_status(
    State(state): State<AppState>,
    Path(staff_id): Path<u32>,
    Json(update): Json<DataStatusUpdate>,
) -> impl IntoResponse {
    let user_id: Option<u32> = None;
    let ip_address: Option<String> = None;

    match StatusService::update_staff_data_status(&state.db, staff_id, update, user_id, ip_address).await {
        Ok(result) => (StatusCode::OK, Json(result)).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

#[utoipa::path(
    put,
    path = "/status/staff-members/{id}/chart-status",
    params(
        ("id" = u32, Path, description = "Staff Member ID")
    ),
    request_body = ChartStatusUpdate,
    responses(
        (status = 200, description = "Status updated", body = StatusUpdateResult),
        (status = 400, description = "Cannot approve with duplicate status"),
        (status = 404, description = "Staff member not found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn update_staff_chart_status(
    State(state): State<AppState>,
    Path(staff_id): Path<u32>,
    Json(update): Json<ChartStatusUpdate>,
) -> impl IntoResponse {
    let user_id: Option<u32> = None;
    let ip_address: Option<String> = None;

    match StatusService::update_staff_chart_status(&state.db, staff_id, update, user_id, ip_address).await {
        Ok(result) => (StatusCode::OK, Json(result)).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

#[utoipa::path(
    get,
    path = "/status/staff-members/{id}/status-history",
    params(
        ("id" = u32, Path, description = "Staff Member ID")
    ),
    responses(
        (status = 200, description = "Status history"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_staff_status_history(
    State(state): State<AppState>,
    Path(staff_id): Path<u32>,
) -> impl IntoResponse {
    match ActionLogService::get_logs_for_entity(&state.db, entity_types::STAFF_MEMBER, staff_id, 50).await {
        Ok(logs) => (StatusCode::OK, Json(logs)).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}
