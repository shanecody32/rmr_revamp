//! Standardized API response wrappers.
//!
//! All API endpoints should use these types for consistent response formatting.
//!
//! # Usage
//!
//! For success responses:
//! ```ignore
//! ApiResponse::ok(data).into_response()
//! ```
//!
//! For cached responses:
//! ```ignore
//! ApiResponse::ok(data).into_cached_response(CACHE_LIST)  // 60s for lists
//! ApiResponse::ok(data).into_cached_response(CACHE_DETAIL)  // 300s for details
//! ```
//!
//! For error responses:
//! ```ignore
//! ApiError::not_found("Band").into_response()
//! ApiError::from(db_err).into_response()
//! ```

/// Cache duration for list/collection endpoints (60 seconds).
pub const CACHE_LIST: u32 = 60;

/// Cache duration for detail/single-item endpoints (300 seconds / 5 minutes).
pub const CACHE_DETAIL: u32 = 300;

/// Cache duration for static/rarely-changing data (1 hour).
pub const CACHE_STATIC: u32 = 3600;

use axum::{
    http::{header, StatusCode, HeaderValue},
    response::{IntoResponse, Response},
    Json,
};
use sea_orm::DbErr;
use serde::Serialize;
use utoipa::ToSchema;

/// Standardized success response wrapper.
///
/// Provides a consistent envelope for all successful API responses.
#[derive(Debug, Serialize, ToSchema)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: T,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

impl<T: Serialize> ApiResponse<T> {
    /// Create a successful response with data.
    pub fn ok(data: T) -> Self {
        Self {
            success: true,
            data,
            message: None,
        }
    }

    /// Create a successful response with data and a message.
    pub fn ok_with_message(data: T, message: impl Into<String>) -> Self {
        Self {
            success: true,
            data,
            message: Some(message.into()),
        }
    }
}

impl<T: Serialize> IntoResponse for ApiResponse<T> {
    fn into_response(self) -> Response {
        (StatusCode::OK, Json(self)).into_response()
    }
}

impl<T: Serialize> ApiResponse<T> {
    /// Convert to response with cache headers.
    ///
    /// # Arguments
    /// * `max_age` - Cache duration in seconds (e.g., 60 for list, 300 for detail)
    pub fn into_cached_response(self, max_age: u32) -> Response {
        let cache_value = format!("public, max-age={}", max_age);
        let mut response = (StatusCode::OK, Json(self)).into_response();
        response.headers_mut().insert(
            header::CACHE_CONTROL,
            HeaderValue::from_str(&cache_value).unwrap_or_else(|_| HeaderValue::from_static("no-cache")),
        );
        response
    }
}

/// Standardized error response.
#[derive(Debug, Serialize, ToSchema)]
pub struct ApiError {
    pub success: bool,
    pub error: ErrorDetail,
}

/// Detailed error information.
#[derive(Debug, Serialize, ToSchema)]
pub struct ErrorDetail {
    /// Machine-readable error code (e.g., "NOT_FOUND", "VALIDATION_ERROR")
    pub code: String,
    /// Human-readable error message
    pub message: String,
    /// Optional field that caused the error (for validation errors)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub field: Option<String>,
}

impl ApiError {
    /// Create a not found error.
    pub fn not_found(entity: &str) -> Self {
        Self {
            success: false,
            error: ErrorDetail {
                code: "NOT_FOUND".to_string(),
                message: format!("{} not found", entity),
                field: None,
            },
        }
    }

    /// Create a validation error.
    pub fn validation(message: impl Into<String>, field: Option<String>) -> Self {
        Self {
            success: false,
            error: ErrorDetail {
                code: "VALIDATION_ERROR".to_string(),
                message: message.into(),
                field,
            },
        }
    }

    /// Create a bad request error (generic client error).
    pub fn bad_request(message: impl Into<String>) -> Self {
        Self {
            success: false,
            error: ErrorDetail {
                code: "BAD_REQUEST".to_string(),
                message: message.into(),
                field: None,
            },
        }
    }

    /// Create an unauthorized error (401).
    pub fn unauthorized(message: impl Into<String>) -> Self {
        Self {
            success: false,
            error: ErrorDetail {
                code: "UNAUTHORIZED".to_string(),
                message: message.into(),
                field: None,
            },
        }
    }

    /// Create a forbidden error (403).
    pub fn forbidden(message: impl Into<String>) -> Self {
        Self {
            success: false,
            error: ErrorDetail {
                code: "FORBIDDEN".to_string(),
                message: message.into(),
                field: None,
            },
        }
    }

    /// Create a conflict error (409).
    pub fn conflict(message: impl Into<String>) -> Self {
        Self {
            success: false,
            error: ErrorDetail {
                code: "CONFLICT".to_string(),
                message: message.into(),
                field: None,
            },
        }
    }

    /// Create an internal server error.
    pub fn internal(message: impl Into<String>) -> Self {
        Self {
            success: false,
            error: ErrorDetail {
                code: "INTERNAL_ERROR".to_string(),
                message: message.into(),
                field: None,
            },
        }
    }

    /// Create an internal server error (generic, hides details from client).
    /// Use this for unexpected errors where you don't want to expose internals.
    pub fn internal_error() -> Self {
        Self::internal("An internal server error occurred")
    }

    /// Create an error from a database error.
    #[deprecated(since = "0.1.0", note = "Use From<DbErr> trait instead")]
    pub fn from_db_err(err: DbErr) -> (StatusCode, Self) {
        tracing::error!("Database error: {}", err);
        match err {
            DbErr::RecordNotFound(msg) => (
                StatusCode::NOT_FOUND,
                Self {
                    success: false,
                    error: ErrorDetail {
                        code: "NOT_FOUND".to_string(),
                        message: msg,
                        field: None,
                    },
                },
            ),
            _ => (
                StatusCode::INTERNAL_SERVER_ERROR,
                Self::internal("An internal server error occurred"),
            ),
        }
    }
}

/// Convert database errors to API errors automatically.
///
/// # Usage
/// ```ignore
/// match service_call().await {
///     Ok(data) => ApiResponse::ok(data).into_response(),
///     Err(e) => ApiError::from(e).into_response(),
/// }
/// ```
impl From<DbErr> for ApiError {
    fn from(err: DbErr) -> Self {
        tracing::error!("Database error: {}", err);
        match err {
            DbErr::RecordNotFound(msg) => Self {
                success: false,
                error: ErrorDetail {
                    code: "NOT_FOUND".to_string(),
                    message: msg,
                    field: None,
                },
            },
            DbErr::RecordNotInserted => Self::internal("Failed to insert record"),
            DbErr::RecordNotUpdated => Self::internal("Failed to update record"),
            DbErr::Custom(msg) => Self::internal(msg),
            _ => Self::internal_error(),
        }
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let status = match self.error.code.as_str() {
            "NOT_FOUND" => StatusCode::NOT_FOUND,
            "VALIDATION_ERROR" | "BAD_REQUEST" => StatusCode::BAD_REQUEST,
            "UNAUTHORIZED" => StatusCode::UNAUTHORIZED,
            "FORBIDDEN" => StatusCode::FORBIDDEN,
            "CONFLICT" => StatusCode::CONFLICT,
            _ => StatusCode::INTERNAL_SERVER_ERROR,
        };
        (status, Json(self)).into_response()
    }
}

