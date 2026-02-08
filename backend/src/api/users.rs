use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use crate::services::user_service::UserService;
use crate::services::types::PaginatedResponse;
use crate::views::ApiError;
use crate::job_state::AppState;
use crate::models::users::Model as User;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct UserFilterParams {
    pub page: Option<u64>,
    pub page_size: Option<u64>,
    pub name: Option<String>,
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(get_users))
        .route("/{id}", get(get_user))
}

#[utoipa::path(
    get,
    path = "/users",
    params(
        ("page" = Option<u64>, Query, description = "Page number (1-based)"),
        ("page_size" = Option<u64>, Query, description = "Items per page"),
        ("name" = Option<String>, Query, description = "Filter by email"),
    ),
    responses(
        (status = 200, description = "Paginated list of users", body = PaginatedResponse<User>),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn get_users(
    State(state): State<AppState>,
    Query(params): Query<UserFilterParams>,
) -> impl IntoResponse {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(25);
    match UserService::get_users(&state.db, params.name, page, page_size).await {
        Ok(response) => (StatusCode::OK, Json(response)).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

#[utoipa::path(
    get,
    path = "/users/{id}",
    params(
        ("id" = i32, Path, description = "User database id")
    ),
    responses(
        (status = 200, description = "User found", body = User),
        (status = 404, description = "User not found"),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn get_user(State(state): State<AppState>, Path(id): Path<u32>) -> impl IntoResponse {
    match UserService::get_user_by_id(&state.db, id).await {
        Ok(Some(user)) => (StatusCode::OK, Json(user)).into_response(),
        Ok(None) => (StatusCode::NOT_FOUND, "User not found").into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}
