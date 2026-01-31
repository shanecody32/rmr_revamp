use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
};
use tracing::error;

pub fn handle_internal_error<E: std::fmt::Display>(err: E) -> Response {
    error!("Internal server error: {}", err);
    (StatusCode::INTERNAL_SERVER_ERROR, "An internal server error occurred. Please try again later.").into_response()
}
