use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use crate::services::location_service::LocationService;
use crate::services::types::{PaginatedResponse, PaginationInfo, SimilarityParams, SimilarResult};
use crate::views::ApiError;
use crate::job_state::AppState;
use crate::models::cities::Model as City;
use serde::Deserialize;
use utoipa::IntoParams;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(get_cities))
        .route("/similar", get(get_similar_cities))
        .route("/{id}", get(get_city))
}

#[utoipa::path(
    get,
    path = "/cities/similar",
    params(
        SimilarityParams
    ),
    responses(
        (status = 200, description = "List similar cities", body = [SimilarResult<City>]),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn get_similar_cities(
    State(state): State<AppState>,
    Query(params): Query<SimilarityParams>,
) -> impl IntoResponse {
    match LocationService::get_similar_cities(&state.db, params).await {
        Ok(cities) => (StatusCode::OK, Json(cities)).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct CityFilterParams {
    pub name: Option<String>,
    pub name_filter_type: Option<String>,
    pub country_id: Option<u32>,
    pub state_id: Option<u32>,
    pub page: Option<u64>,
    pub page_size: Option<u64>,
}

#[utoipa::path(
    get,
    path = "/cities",
    params(
        CityFilterParams
    ),
    responses(
        (status = 200, description = "List all cities", body = PaginatedResponse<City>),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn get_cities(
    State(state): State<AppState>,
    Query(params): Query<CityFilterParams>,
) -> impl IntoResponse {
    match LocationService::get_cities(&state.db, params.country_id, params.state_id).await {
        Ok(cities) => {
            let filtered: Vec<_> = cities.into_iter().filter(|c| {
                if let Some(name) = &params.name {
                    if name.is_empty() { return true; }
                    let name_low = name.to_lowercase();
                    let c_name = c.name.as_ref().map(|n| n.to_lowercase()).unwrap_or_default();
                    
                    match params.name_filter_type.as_deref() {
                        Some("starts_with") => c_name.starts_with(&name_low),
                        Some("ends_with") => c_name.ends_with(&name_low),
                        Some("exact_match") => c_name == name_low,
                        _ => c_name.contains(&name_low),
                    }
                } else {
                    true
                }
            }).collect();
            
            let total_items = filtered.len() as u64;
            let page = params.page.unwrap_or(1);
            let page_size = params.page_size.unwrap_or(10);
            
            let results = filtered.into_iter()
                .skip(((page - 1) * page_size) as usize)
                .take(page_size as usize)
                .collect();

            (StatusCode::OK, Json(PaginatedResponse {
                results,
                pagination: PaginationInfo {
                    page,
                    page_size,
                    total_pages: total_items.div_ceil(page_size),
                    total_items,
                }
            })).into_response()
        },
        Err(e) => ApiError::from(e).into_response(),
    }
}

#[utoipa::path(
    get,
    path = "/cities/{id}",
    params(
        ("id" = i32, Path, description = "City id")
    ),
    responses(
        (status = 200, description = "City found", body = City),
        (status = 404, description = "City not found")
    )
)]
pub(crate) async fn get_city(State(state): State<AppState>, Path(id): Path<u32>) -> impl IntoResponse {
    match LocationService::get_city_by_id(&state.db, id).await {
        Ok(Some(city)) => (StatusCode::OK, Json(city)).into_response(),
        Ok(None) => (StatusCode::NOT_FOUND, "City not found").into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}
