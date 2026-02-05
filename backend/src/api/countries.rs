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
    match LocationService::get_countries(&state.db).await {
        Ok(countries) => {
            let filtered: Vec<_> = countries.into_iter().filter(|c| {
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
