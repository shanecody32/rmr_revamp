//! Tests for PaginationInfo and PaginationParams.

use backend::views::common::{PaginationInfo, PaginationParams};

#[test]
fn test_basic_page_calculation() {
    let info = PaginationInfo::new(1, 10, 100);
    assert_eq!(info.total_pages, 10);
    assert_eq!(info.total_items, 100);
    assert_eq!(info.page, 1);
    assert_eq!(info.page_size, 10);
}

#[test]
fn test_partial_last_page() {
    let info = PaginationInfo::new(1, 10, 15);
    assert_eq!(info.total_pages, 2);
}

#[test]
fn test_zero_items_returns_one_page() {
    let info = PaginationInfo::new(1, 10, 0);
    assert_eq!(info.total_pages, 1);
}

#[test]
fn test_exact_multiple() {
    let info = PaginationInfo::new(1, 25, 75);
    assert_eq!(info.total_pages, 3);
}

#[test]
fn test_single_item() {
    let info = PaginationInfo::new(1, 10, 1);
    assert_eq!(info.total_pages, 1);
}

#[test]
fn test_pagination_params_defaults() {
    let params = PaginationParams::default();
    assert_eq!(params.page(), 1);
    assert_eq!(params.page_size(), 10);
}

#[test]
fn test_pagination_params_page_clamping() {
    // page=0 should clamp to 1
    let params = PaginationParams { page: Some(0), page_size: None };
    assert_eq!(params.page(), 1);

    // Explicit page=5 should be preserved
    let params = PaginationParams { page: Some(5), page_size: None };
    assert_eq!(params.page(), 5);
}

#[test]
fn test_pagination_params_page_size_clamping() {
    // page_size=500 should clamp to 100
    let params = PaginationParams { page: None, page_size: Some(500) };
    assert_eq!(params.page_size(), 100);

    // page_size=0 should clamp to 1
    let params = PaginationParams { page: None, page_size: Some(0) };
    assert_eq!(params.page_size(), 1);

    // Normal page_size preserved
    let params = PaginationParams { page: None, page_size: Some(25) };
    assert_eq!(params.page_size(), 25);
}

#[test]
fn test_offset_calculation() {
    // Page 1, size 10 -> offset 0
    let params = PaginationParams { page: Some(1), page_size: Some(10) };
    assert_eq!(params.offset(), 0);

    // Page 3, size 20 -> offset 40
    let params = PaginationParams { page: Some(3), page_size: Some(20) };
    assert_eq!(params.offset(), 40);

    // Page 1, size 100 -> offset 0
    let params = PaginationParams { page: Some(1), page_size: Some(100) };
    assert_eq!(params.offset(), 0);

    // Defaults: page=1, size=10 -> offset 0
    let params = PaginationParams::default();
    assert_eq!(params.offset(), 0);
}
