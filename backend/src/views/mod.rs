//! View layer for API responses.
//!
//! This module provides structured response types that separate presentation
//! concerns from the business logic in services. Views are organized by entity
//! and come in different variants optimized for different use cases:
//!
//! - **List views**: Minimal fields for table displays (using partial models)
//! - **Detail views**: Full entity data with all relations
//! - **Summary views**: Compact representations for embedding in other responses

pub mod common;
pub mod band;
pub mod album;
pub mod staff;

pub use common::{ApiResponse, ApiError, ErrorDetail, PaginationInfo, PaginatedResponse};
