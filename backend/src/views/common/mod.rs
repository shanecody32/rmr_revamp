//! Common view types shared across all entities.

mod response;
mod pagination;

pub use response::{ApiResponse, ApiError, ErrorDetail, CACHE_LIST, CACHE_DETAIL, CACHE_STATIC};
pub use pagination::{PaginationInfo, PaginatedResponse, PaginationParams};
