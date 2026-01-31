use axum::{
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use crate::services::auth_service::{AuthService, LoginRequest, LoginResponse};
use crate::models::users::Model as User;
use crate::job_state::AppState;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/login", post(login))
        .route("/current", get(get_current_user))
}

#[utoipa::path(
    post,
    path = "/auth/login",
    request_body = LoginRequest,
    responses(
        (status = 200, description = "Login successful", body = LoginResponse),
        (status = 404, description = "User not found"),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn login(State(state): State<AppState>, Json(req): Json<LoginRequest>) -> impl IntoResponse {
    match AuthService::login(&state.db, req).await {
        Ok(response) => (StatusCode::OK, Json(response)).into_response(),
        Err(sea_orm::DbErr::RecordNotFound(msg)) => (StatusCode::NOT_FOUND, msg).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

#[utoipa::path(
    get,
    path = "/auth/current",
    responses(
        (status = 200, description = "Current user found", body = User),
        (status = 404, description = "User not found"),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn get_current_user(State(state): State<AppState>) -> impl IntoResponse {
    match AuthService::get_current_user(&state.db).await {
        Ok(Some(user)) => (StatusCode::OK, Json(user)).into_response(),
        Ok(None) => (StatusCode::NOT_FOUND, "User not found").into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}
