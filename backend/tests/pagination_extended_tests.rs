//! Extended pagination edge case tests.

use backend::views::common::{PaginatedResponse, PaginationInfo, PaginationParams};

#[test]
fn test_paginated_response_new_constructor() {
    let resp: PaginatedResponse<String> = PaginatedResponse::new(
        vec!["a".to_string(), "b".to_string()],
        1,
        10,
        25,
    );
    assert_eq!(resp.results.len(), 2);
    assert_eq!(resp.pagination.page, 1);
    assert_eq!(resp.pagination.page_size, 10);
    assert_eq!(resp.pagination.total_items, 25);
    assert_eq!(resp.pagination.total_pages, 3); // ceil(25/10)
}

#[test]
fn test_large_total_items() {
    let info = PaginationInfo::new(1, 100, 1_000_000);
    assert_eq!(info.total_pages, 10_000);
    assert_eq!(info.total_items, 1_000_000);
}

#[test]
fn test_page_size_one() {
    let info = PaginationInfo::new(1, 1, 50);
    assert_eq!(info.total_pages, 50);
}

#[test]
fn test_pagination_info_zero_items() {
    let info = PaginationInfo::new(1, 10, 0);
    // Zero items should give total_pages = 1 (not 0)
    assert_eq!(info.total_pages, 1);
}

#[test]
fn test_pagination_info_is_clone() {
    let info = PaginationInfo::new(2, 20, 100);
    let cloned = info.clone();
    assert_eq!(cloned.page, 2);
    assert_eq!(cloned.page_size, 20);
    assert_eq!(cloned.total_items, 100);
}

#[test]
fn test_pagination_params_default() {
    let params = PaginationParams::default();
    assert!(params.page.is_none());
    assert!(params.page_size.is_none());
    // Default accessors
    assert_eq!(params.page(), 1);
    assert_eq!(params.page_size(), 10);
    assert_eq!(params.offset(), 0);
}

#[test]
fn test_pagination_params_offset_at_max_page() {
    let params = PaginationParams {
        page: Some(100),
        page_size: Some(50),
    };
    assert_eq!(params.offset(), 99 * 50);
}

#[test]
fn test_pagination_params_page_size_capped_at_100() {
    let params = PaginationParams {
        page: Some(1),
        page_size: Some(500),
    };
    assert_eq!(params.page_size(), 100);
}

#[test]
fn test_pagination_params_page_min_is_1() {
    let params = PaginationParams {
        page: Some(0),
        page_size: Some(10),
    };
    assert_eq!(params.page(), 1);
    assert_eq!(params.offset(), 0);
}
