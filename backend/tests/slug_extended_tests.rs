//! Extended tests for extract_search_terms() from slug.rs.

use backend::utils::slug::extract_search_terms;

#[test]
fn test_basic_splitting_on_ampersand() {
    let terms = extract_search_terms("Devon Allman & Nightvision");
    assert!(terms.contains(&"devon allman & nightvision".to_string()));
    assert!(terms.contains(&"devon allman".to_string()));
    assert!(terms.contains(&"nightvision".to_string()));
}

#[test]
fn test_splitting_on_and() {
    let terms = extract_search_terms("Willie Nelson and Dolly Parton");
    assert!(terms.contains(&"willie nelson and dolly parton".to_string()));
    assert!(terms.contains(&"willie nelson".to_string()));
    assert!(terms.contains(&"dolly parton".to_string()));
}

#[test]
fn test_splitting_on_feat() {
    let terms = extract_search_terms("Drake feat. Rihanna");
    assert!(terms.contains(&"drake feat. rihanna".to_string()));
    assert!(terms.contains(&"drake".to_string()));
    assert!(terms.contains(&"rihanna".to_string()));
}

#[test]
fn test_splitting_on_featuring() {
    let terms = extract_search_terms("Drake featuring Rihanna");
    assert!(terms.contains(&"drake".to_string()));
    assert!(terms.contains(&"rihanna".to_string()));
}

#[test]
fn test_splitting_on_vs() {
    let terms = extract_search_terms("Red vs Blue");
    assert!(terms.contains(&"blue".to_string()));
}

#[test]
fn test_the_prefix_stripping() {
    let terms = extract_search_terms("The Rolling Stones");
    assert!(terms.contains(&"the rolling stones".to_string()));
    assert!(terms.contains(&"rolling stones".to_string()));
}

#[test]
fn test_possessive_handling() {
    let terms = extract_search_terms("Devon Allman's Honeytribe");
    // Should contain the version without possessive
    assert!(
        terms.iter().any(|t| t == "devon allman honeytribe"),
        "Should strip possessive. Got: {:?}",
        terms
    );
}

#[test]
fn test_empty_input() {
    let terms = extract_search_terms("");
    assert!(terms.is_empty());
}

#[test]
fn test_single_short_word() {
    // Words < 2 chars are filtered out, "ab" (2 chars) should be kept
    let terms = extract_search_terms("Ab");
    assert!(terms.contains(&"ab".to_string()));
}

#[test]
fn test_single_long_word() {
    let terms = extract_search_terms("Metallica");
    assert!(terms.contains(&"metallica".to_string()));
}

#[test]
fn test_significant_words_extracted() {
    // Words >= 4 chars should be extracted individually
    let terms = extract_search_terms("Devon Allman Band");
    assert!(terms.contains(&"devon".to_string()));
    assert!(terms.contains(&"allman".to_string()));
    // "band" is in the skip list, should not appear individually
    assert!(!terms.iter().any(|t| t == "band"), "Common word 'band' should be skipped");
}

#[test]
fn test_deduplication() {
    // Same term shouldn't appear twice
    let terms = extract_search_terms("Test and Test");
    let count = terms.iter().filter(|t| *t == "test").count();
    assert_eq!(count, 1, "Duplicate terms should be deduplicated");
}
