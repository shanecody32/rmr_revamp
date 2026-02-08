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
use crate::models::sub_genres::Model as SubGenre;
use serde::Deserialize;
use utoipa::IntoParams;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(get_sub_genres))
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct SubGenreFilterParams {
    pub name: Option<String>,
    pub name_filter_type: Option<String>,
    pub genre_id: Option<u32>,
    pub page: Option<u64>,
    pub page_size: Option<u64>,
}

#[utoipa::path(
    get,
    path = "/sub_genres",
    params(
        SubGenreFilterParams
    ),
    responses(
        (status = 200, description = "List all subgenres", body = PaginatedResponse<SubGenre>),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn get_sub_genres(
    State(state): State<AppState>,
    Query(params): Query<SubGenreFilterParams>,
) -> impl IntoResponse {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);

    match GenreService::get_sub_genres(&state.db, params.genre_id, params.name, params.name_filter_type, page, page_size).await {
        Ok(paginated) => (StatusCode::OK, Json(paginated)).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}
