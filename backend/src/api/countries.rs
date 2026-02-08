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
use crate::models::countries::Model as Country;
use serde::Deserialize;
use utoipa::IntoParams;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(get_countries))
        .route("/similar", get(get_similar_countries))
        .route("/{id}", get(get_country))
}

#[utoipa::path(
    get,
    path = "/countries/similar",
    params(
        SimilarityParams
    ),
    responses(
        (status = 200, description = "List similar countries", body = [SimilarResult<Country>]),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn get_similar_countries(
    State(state): State<AppState>,
    Query(params): Query<SimilarityParams>,
) -> impl IntoResponse {
    match LocationService::get_similar_countries(&state.db, params).await {
        Ok(countries) => (StatusCode::OK, Json(countries)).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct CountryFilterParams {
    pub name: Option<String>,
    pub name_filter_type: Option<String>,
    pub page: Option<u64>,
    pub page_size: Option<u64>,
}

#[utoipa::path(
    get,
    path = "/countries",
    params(
        CountryFilterParams
    ),
    responses(
        (status = 200, description = "List all countries", body = PaginatedResponse<Country>),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn get_countries(
    State(state): State<AppState>,
    Query(params): Query<CountryFilterParams>,
) -> impl IntoResponse {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);

    match LocationService::get_countries(&state.db, params.name, params.name_filter_type, page, page_size).await {
        Ok(paginated) => (StatusCode::OK, Json(paginated)).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

#[utoipa::path(
    get,
    path = "/countries/{id}",
    params(
        ("id" = i32, Path, description = "Country id")
    ),
    responses(
        (status = 200, description = "Country found", body = Country),
        (status = 404, description = "Country not found")
    )
)]
pub(crate) async fn get_country(State(state): State<AppState>, Path(id): Path<u32>) -> impl IntoResponse {
    match LocationService::get_country_by_id(&state.db, id).await {
        Ok(Some(country)) => (StatusCode::OK, Json(country)).into_response(),
        Ok(None) => (StatusCode::NOT_FOUND, "Country not found").into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}
