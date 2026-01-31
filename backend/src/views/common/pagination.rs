//! Pagination types for list endpoints.

use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};

/// Pagination metadata included in list responses.
#[derive(Debug, Serialize, ToSchema, Clone)]
pub struct PaginationInfo {
    pub page: u64,
    pub page_size: u64,
    pub total_pages: u64,
    pub total_items: u64,
}

impl PaginationInfo {
    /// Create a new PaginationInfo.
    pub fn new(page: u64, page_size: u64, total_items: u64) -> Self {
        let total_pages = if total_items == 0 {
            1
        } else {
            (total_items + page_size - 1) / page_size
        };
        Self {
            page,
            page_size,
            total_pages,
            total_items,
        }
    }
}

/// Paginated response wrapper.
///
/// Wraps a list of results with pagination metadata.
#[derive(Debug, Serialize, ToSchema)]
pub struct PaginatedResponse<T> {
    pub results: Vec<T>,
    pub pagination: PaginationInfo,
}

impl<T> PaginatedResponse<T> {
    /// Create a new paginated response.
    pub fn new(results: Vec<T>, page: u64, page_size: u64, total_items: u64) -> Self {
        Self {
            results,
            pagination: PaginationInfo::new(page, page_size, total_items),
        }
    }
}

/// Query parameters for pagination.
#[derive(Debug, Deserialize, IntoParams, Default)]
pub struct PaginationParams {
    /// Page number (1-indexed). Defaults to 1.
    pub page: Option<u64>,
    /// Number of items per page. Defaults to 10.
    pub page_size: Option<u64>,
}

impl PaginationParams {
    /// Get the page number, defaulting to 1.
    pub fn page(&self) -> u64 {
        self.page.unwrap_or(1).max(1)
    }

    /// Get the page size, defaulting to 10 and capping at 100.
    pub fn page_size(&self) -> u64 {
        self.page_size.unwrap_or(10).clamp(1, 100)
    }

    /// Get the offset for database queries.
    pub fn offset(&self) -> u64 {
        (self.page() - 1) * self.page_size()
    }
}
