use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use crate::services::location_service::LocationService;
use crate::services::types::{PaginatedResponse, PaginationInfo, SimilarityParams, SimilarResult};
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
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
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
    match LocationService::get_states(&state.db, params.country_id).await {
        Ok(states) => {
            let filtered: Vec<_> = states.into_iter().filter(|s| {
                if let Some(name) = &params.name {
                    if name.is_empty() { return true; }
                    let name_low = name.to_lowercase();
                    let s_name = s.name.as_ref().map(|n| n.to_lowercase()).unwrap_or_default();
                    
                    match params.name_filter_type.as_deref() {
                        Some("starts_with") => s_name.starts_with(&name_low),
                        Some("ends_with") => s_name.ends_with(&name_low),
                        Some("exact_match") => s_name == name_low,
                        _ => s_name.contains(&name_low),
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
                    total_pages: (total_items + page_size - 1) / page_size,
                    total_items,
                }
            })).into_response()
        },
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
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
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}
