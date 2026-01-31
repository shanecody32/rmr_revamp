//! Common view types shared across all entities.

mod response;
mod pagination;

pub use response::{ApiResponse, ApiError, ErrorDetail};
pub use pagination::{PaginationInfo, PaginatedResponse, PaginationParams};
