use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use crate::services::user_service::UserService;
use crate::job_state::AppState;
use crate::models::users::Model as User;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(get_users))
        .route("/{id}", get(get_user))
}

#[utoipa::path(
    get,
    path = "/users",
    responses(
        (status = 200, description = "List all users", body = [User]),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn get_users(State(state): State<AppState>) -> impl IntoResponse {
    match UserService::get_all_users(&state.db).await {
        Ok(users) => (StatusCode::OK, Json(users)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
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
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}
