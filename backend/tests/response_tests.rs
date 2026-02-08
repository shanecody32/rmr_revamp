//! Tests for ApiError and ApiResponse.

use backend::views::common::{ApiResponse, ApiError};
use sea_orm::DbErr;

#[test]
fn test_not_found_sets_code() {
    let err = ApiError::not_found("Band");
    assert_eq!(err.error.code, "NOT_FOUND");
    assert_eq!(err.error.message, "Band not found");
    assert!(!err.success);
    assert!(err.error.field.is_none());
}

#[test]
fn test_from_dberr_record_not_found() {
    let db_err = DbErr::RecordNotFound("Band #42 not found".to_string());
    let api_err = ApiError::from(db_err);
    assert_eq!(api_err.error.code, "NOT_FOUND");
    assert_eq!(api_err.error.message, "Band #42 not found");
}

#[test]
fn test_from_dberr_record_not_inserted() {
    let db_err = DbErr::RecordNotInserted;
    let api_err = ApiError::from(db_err);
    assert_eq!(api_err.error.code, "INTERNAL_ERROR");
    assert_eq!(api_err.error.message, "Failed to insert record");
}

#[test]
fn test_from_dberr_record_not_updated() {
    let db_err = DbErr::RecordNotUpdated;
    let api_err = ApiError::from(db_err);
    assert_eq!(api_err.error.code, "INTERNAL_ERROR");
    assert_eq!(api_err.error.message, "Failed to update record");
}

#[test]
fn test_from_dberr_custom_includes_message() {
    let db_err = DbErr::Custom("unique constraint violated".to_string());
    let api_err = ApiError::from(db_err);
    assert_eq!(api_err.error.code, "INTERNAL_ERROR");
    assert_eq!(api_err.error.message, "unique constraint violated");
}

#[test]
fn test_from_dberr_other_hides_internals() {
    // A connection error should not leak internal details
    let db_err = DbErr::Conn(sea_orm::RuntimeErr::Internal("connection refused at 192.168.1.1:3306".to_string()));
    let api_err = ApiError::from(db_err);
    assert_eq!(api_err.error.code, "INTERNAL_ERROR");
    assert_eq!(api_err.error.message, "An internal server error occurred");
}

#[test]
fn test_api_response_ok() {
    let response = ApiResponse::ok("hello");
    assert!(response.success);
    assert_eq!(response.data, "hello");
    assert!(response.message.is_none());
}

#[test]
fn test_api_response_ok_with_message() {
    let response = ApiResponse::ok_with_message(42, "Created successfully");
    assert!(response.success);
    assert_eq!(response.data, 42);
    assert_eq!(response.message.as_deref(), Some("Created successfully"));
}

#[test]
fn test_validation_error() {
    let err = ApiError::validation("Name is required", Some("name".to_string()));
    assert_eq!(err.error.code, "VALIDATION_ERROR");
    assert_eq!(err.error.message, "Name is required");
    assert_eq!(err.error.field.as_deref(), Some("name"));
}

#[test]
fn test_bad_request_error() {
    let err = ApiError::bad_request("Invalid input");
    assert_eq!(err.error.code, "BAD_REQUEST");
    assert_eq!(err.error.message, "Invalid input");
}

#[test]
fn test_internal_error_generic() {
    let err = ApiError::internal_error();
    assert_eq!(err.error.code, "INTERNAL_ERROR");
    assert_eq!(err.error.message, "An internal server error occurred");
}

#[test]
fn test_unauthorized_error() {
    let err = ApiError::unauthorized("Token expired");
    assert_eq!(err.error.code, "UNAUTHORIZED");
    assert_eq!(err.error.message, "Token expired");
    assert!(!err.success);
    assert!(err.error.field.is_none());
}

#[test]
fn test_forbidden_error() {
    let err = ApiError::forbidden("Insufficient permissions");
    assert_eq!(err.error.code, "FORBIDDEN");
    assert_eq!(err.error.message, "Insufficient permissions");
    assert!(!err.success);
}

#[test]
fn test_conflict_error() {
    let err = ApiError::conflict("Entity already exists");
    assert_eq!(err.error.code, "CONFLICT");
    assert_eq!(err.error.message, "Entity already exists");
    assert!(!err.success);
}

#[test]
fn test_bad_request_field_is_none() {
    let err = ApiError::bad_request("Bad input");
    assert!(err.error.field.is_none());
}

#[test]
fn test_internal_with_custom_message() {
    let err = ApiError::internal("Custom internal error");
    assert_eq!(err.error.code, "INTERNAL_ERROR");
    assert_eq!(err.error.message, "Custom internal error");
}

#[test]
fn test_cache_constants() {
    use backend::views::common::{CACHE_LIST, CACHE_DETAIL, CACHE_STATIC};
    assert_eq!(CACHE_LIST, 60);
    assert_eq!(CACHE_DETAIL, 300);
    assert_eq!(CACHE_STATIC, 3600);
}
