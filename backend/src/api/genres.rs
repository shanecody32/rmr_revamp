use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use crate::services::genre_service::GenreService;
use crate::services::types::PaginatedResponse;
use crate::views::ApiError;
use crate::job_state::AppState;
use crate::models::genres::Model as Genre;
use serde::Deserialize;
use utoipa::IntoParams;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(get_genres))
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct GenreFilterParams {
    pub name: Option<String>,
    pub name_filter_type: Option<String>,
    pub page: Option<u64>,
    pub page_size: Option<u64>,
}

#[utoipa::path(
    get,
    path = "/genres",
    params(
        GenreFilterParams
    ),
    responses(
        (status = 200, description = "List all genres", body = PaginatedResponse<Genre>),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn get_genres(
    State(state): State<AppState>,
    Query(params): Query<GenreFilterParams>,
) -> impl IntoResponse {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);

    match GenreService::get_genres(&state.db, params.name, params.name_filter_type, page, page_size).await {
        Ok(paginated) => (StatusCode::OK, Json(paginated)).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}
