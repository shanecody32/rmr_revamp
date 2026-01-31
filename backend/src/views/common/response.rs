//! Standardized API response wrappers.
//!
//! All API endpoints should use these types for consistent response formatting.

use axum::{
    http::StatusCode,
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

    /// Create an error from a database error.
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

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let status = match self.error.code.as_str() {
            "NOT_FOUND" => StatusCode::NOT_FOUND,
            "VALIDATION_ERROR" => StatusCode::BAD_REQUEST,
            _ => StatusCode::INTERNAL_SERVER_ERROR,
        };
        (status, Json(self)).into_response()
    }
}

