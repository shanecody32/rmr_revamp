//! Tests for slug generation and name sanitization.
//!
//! These are unit tests for the slug module - pure functions that don't
//! require database access.

use backend::utils::slug::{slug_it, sanitize_name};

mod common;

#[test]
fn test_slug_basic() {
    assert_eq!(slug_it("Hello World"), "hello-world");
    assert_eq!(slug_it("The Beatles"), "beatles");
    // AC/DC - slash becomes "and"
    assert_eq!(slug_it("AC/DC"), "ac-and-dc");
}

#[test]
fn test_slug_special_characters() {
    // Ampersand becomes "and"
    assert_eq!(slug_it("Tom & Jerry"), "tom-and-jerry");

    // Various special chars
    assert_eq!(slug_it("Rock & Roll!"), "rock-and-roll");
    assert_eq!(slug_it("What's Up?"), "whats-up");
}

#[test]
fn test_slug_numbers() {
    // Numbers are converted to words
    assert_eq!(slug_it("Blink 182"), "blink-one-hundred-eighty-two");
    assert_eq!(slug_it("2Pac"), "twopac");
    assert_eq!(slug_it("50 Cent"), "fifty-cent");
}

#[test]
fn test_slug_leading_the() {
    // "The" at start should be removed
    assert_eq!(slug_it("The Rolling Stones"), "rolling-stones");
    assert_eq!(slug_it("The Who"), "who");

    // "The" in middle should remain
    assert!(slug_it("Over The Rainbow").contains("the"));
}

#[test]
fn test_slug_connectors() {
    // Connectors like "and" are kept (not removed)
    assert_eq!(slug_it("Hall and Oates"), "hall-and-oates");
    // Ampersand becomes "and"
    assert_eq!(slug_it("Simon & Garfunkel"), "simon-and-garfunkel");
}

#[test]
fn test_slug_unicode() {
    // Unicode characters should be normalized
    assert_eq!(slug_it("Björk"), "bjork");
    assert_eq!(slug_it("Motörhead"), "motorhead");
    assert_eq!(slug_it("Sigur Rós"), "sigur-ros");
}

#[test]
fn test_slug_whitespace() {
    // Multiple spaces should collapse
    assert_eq!(slug_it("Too  Many   Spaces"), "too-many-spaces");

    // Leading/trailing whitespace should be trimmed
    assert_eq!(slug_it("  Padded  "), "padded");
}

#[test]
fn test_slug_empty_and_edge_cases() {
    assert_eq!(slug_it(""), "");
    assert_eq!(slug_it("   "), "");
    // Just "The" stays as "the" (only removed when followed by other words)
    assert_eq!(slug_it("The"), "the");
}

#[test]
fn test_slug_dollar_sign() {
    // Dollar signs have special handling
    let result = slug_it("$uicideboy$");
    assert!(!result.is_empty(), "Dollar sign handling should produce output");
}

#[test]
fn test_sanitize_name_basic() {
    // sanitize_name should lowercase and remove special chars
    let sanitized = sanitize_name("Hello World!");
    assert_eq!(sanitized, "hello world");

    let sanitized = sanitize_name("AC/DC");
    assert!(sanitized.contains("ac") && sanitized.contains("dc"));
}

#[test]
fn test_sanitize_name_preserves_spaces() {
    // Unlike slug_it, sanitize_name preserves word boundaries for matching
    let sanitized = sanitize_name("The Beatles");
    assert!(sanitized.contains("beatles"));
}

#[test]
fn test_sanitize_name_with_ampersand() {
    // Ampersand is preserved in sanitize_name
    let sanitized = sanitize_name("Willie Nelson & Dolly Parton");
    assert!(sanitized.contains("willie") && sanitized.contains("dolly"));
}

#[test]
fn test_slug_consistency() {
    // Same input should always produce same output
    let input = "Random Band Name 123";
    let slug1 = slug_it(input);
    let slug2 = slug_it(input);
    assert_eq!(slug1, slug2);
}

#[test]
fn test_slug_no_consecutive_hyphens() {
    // Result should never have -- in it
    let result = slug_it("A - B - C");
    assert!(!result.contains("--"), "Got: {}", result);
}

#[test]
fn test_slug_no_leading_trailing_hyphens() {
    let result = slug_it("-Leading Hyphen");
    assert!(!result.starts_with('-'), "Got: {}", result);

    let result = slug_it("Trailing Hyphen-");
    assert!(!result.ends_with('-'), "Got: {}", result);
}

// Additional tests for documented behavior
#[test]
fn test_slug_number_conversion() {
    // Verify number-to-word conversion
    assert!(slug_it("100").contains("hundred"));
    assert!(slug_it("21").contains("twenty"));
}

#[test]
fn test_slug_ft_handling() {
    // "ft" (featuring) handling
    let result = slug_it("Artist ft. Another");
    assert!(result.contains("artist"));
}
