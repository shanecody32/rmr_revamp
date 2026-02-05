//! Error handling utilities.
//!
//! Note: The `handle_internal_error` function has been deprecated in favor of
//! using `ApiError::from(err).into_response()` from `crate::views::ApiError`.
//!
//! All API handlers should now use the structured `ApiError` type for consistent
//! error responses across the application.
