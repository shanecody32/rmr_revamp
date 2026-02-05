use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post, put, delete},
    Json, Router,
};
use crate::services::radio_station_service::{RadioStationService, RadioStationFilterParams, MergeRadioStationsRequest};
use crate::services::types::{PaginatedResponse, SimilarityParams, SimilarResult};
use crate::views::ApiError;
use crate::job_state::AppState;
use crate::models::radio_stations::Model as RadioStation;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(get_radio_stations))
        .route("/", post(create_radio_station))
        .route("/similar", get(get_similar_radio_stations))
        .route("/merge", post(merge_radio_stations))
        .route("/{id}", get(get_radio_station))
        .route("/{id}", put(update_radio_station))
        .route("/{id}", delete(delete_radio_station))
}

#[utoipa::path(
    get,
    path = "/radio_stations/similar",
    params(
        SimilarityParams
    ),
    responses(
        (status = 200, description = "List similar radio stations", body = [SimilarResult<RadioStation>]),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn get_similar_radio_stations(
    State(state): State<AppState>,
    Query(params): Query<SimilarityParams>,
) -> impl IntoResponse {
    match RadioStationService::get_similar_radio_stations(&state.db, params).await {
        Ok(stations) => (StatusCode::OK, Json(stations)).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

#[utoipa::path(
    get,
    path = "/radio_stations",
    params(
        RadioStationFilterParams
    ),
    responses(
        (status = 200, description = "List all radio stations", body = PaginatedResponse<RadioStation>),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn get_radio_stations(
    State(state): State<AppState>,
    Query(params): Query<RadioStationFilterParams>,
) -> impl IntoResponse {
    match RadioStationService::get_radio_stations(&state.db, params).await {
        Ok(paginated) => (StatusCode::OK, Json(paginated)).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

#[utoipa::path(
    post,
    path = "/radio_stations",
    request_body = RadioStation,
    responses(
        (status = 201, description = "Radio station created", body = RadioStation),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn create_radio_station(State(state): State<AppState>, Json(data): Json<RadioStation>) -> impl IntoResponse {
    match RadioStationService::create_radio_station(&state.db, data).await {
        Ok(station) => (StatusCode::CREATED, Json(station)).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

#[utoipa::path(
    get,
    path = "/radio_stations/{id}",
    params(
        ("id" = i32, Path, description = "Radio station database id")
    ),
    responses(
        (status = 200, description = "Radio station found", body = RadioStation),
        (status = 404, description = "Radio station not found"),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn get_radio_station(State(state): State<AppState>, Path(id): Path<u32>) -> impl IntoResponse {
    match RadioStationService::get_radio_station_by_id(&state.db, id).await {
        Ok(Some(station)) => (StatusCode::OK, Json(station)).into_response(),
        Ok(None) => ApiError::not_found("Radio station").into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

#[utoipa::path(
    put,
    path = "/radio_stations/{id}",
    params(
        ("id" = i32, Path, description = "Radio station database id")
    ),
    request_body = RadioStation,
    responses(
        (status = 200, description = "Radio station updated", body = RadioStation),
        (status = 404, description = "Radio station not found"),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn update_radio_station(
    State(state): State<AppState>,
    Path(id): Path<u32>,
    Json(data): Json<RadioStation>,
) -> impl IntoResponse {
    match RadioStationService::update_radio_station(&state.db, id, data).await {
        Ok(station) => (StatusCode::OK, Json(station)).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

#[utoipa::path(
    delete,
    path = "/radio_stations/{id}",
    params(
        ("id" = i32, Path, description = "Radio station database id")
    ),
    responses(
        (status = 204, description = "Radio station deleted"),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn delete_radio_station(State(state): State<AppState>, Path(id): Path<u32>) -> impl IntoResponse {
    match RadioStationService::delete_radio_station(&state.db, id).await {
        Ok(_) => StatusCode::NO_CONTENT.into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

pub(crate) async fn merge_radio_stations(State(state): State<AppState>, Json(req): Json<MergeRadioStationsRequest>) -> impl IntoResponse {
    // TODO: Extract user_id and ip_address from auth context when auth is implemented
    let user_id: Option<u32> = None;
    let ip_address: Option<String> = None;

    match RadioStationService::merge_radio_stations(&state.db, req, user_id, ip_address).await {
        Ok(result) => (StatusCode::OK, Json(result)).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}
