use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use crate::services::location_service::LocationService;
use crate::services::types::{PaginatedResponse, SimilarityParams, SimilarResult};
use crate::views::ApiError;
use crate::job_state::AppState;
use crate::models::states::Model as StateModel;
use serde::Deserialize;
use utoipa::IntoParams;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(get_states))
        .route("/similar", get(get_similar_states))
        .route("/{id}", get(get_state))
}

#[utoipa::path(
    get,
    path = "/states/similar",
    params(
        SimilarityParams
    ),
    responses(
        (status = 200, description = "List similar states", body = [SimilarResult<StateModel>]),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn get_similar_states(
    State(state): State<AppState>,
    Query(params): Query<SimilarityParams>,
) -> impl IntoResponse {
    match LocationService::get_similar_states(&state.db, params).await {
        Ok(states) => (StatusCode::OK, Json(states)).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct StateFilterParams {
    pub name: Option<String>,
    pub name_filter_type: Option<String>,
    pub country_id: Option<u32>,
    pub page: Option<u64>,
    pub page_size: Option<u64>,
}

#[utoipa::path(
    get,
    path = "/states",
    params(
        StateFilterParams
    ),
    responses(
        (status = 200, description = "List all states", body = PaginatedResponse<StateModel>),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn get_states(
    State(state): State<AppState>,
    Query(params): Query<StateFilterParams>,
) -> impl IntoResponse {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);

    match LocationService::get_states(&state.db, params.country_id, params.name, params.name_filter_type, page, page_size).await {
        Ok(paginated) => (StatusCode::OK, Json(paginated)).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

#[utoipa::path(
    get,
    path = "/states/{id}",
    params(
        ("id" = i32, Path, description = "State id")
    ),
    responses(
        (status = 200, description = "State found", body = StateModel),
        (status = 404, description = "State not found")
    )
)]
pub(crate) async fn get_state(State(state): State<AppState>, Path(id): Path<u32>) -> impl IntoResponse {
    match LocationService::get_state_by_id(&state.db, id).await {
        Ok(Some(state_data)) => (StatusCode::OK, Json(state_data)).into_response(),
        Ok(None) => (StatusCode::NOT_FOUND, "State not found").into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}
