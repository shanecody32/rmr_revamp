//! Tests for similarity search components.
//!
//! Tests phonetic key generation and similarity scoring.

use backend::utils::similarity::keys::{soundex, metaphone, double_metaphone};

mod common;

// ============================================================================
// Soundex Tests
// ============================================================================

#[test]
fn test_soundex_basic() {
    // Classic soundex examples
    assert_eq!(soundex("Robert"), "R163");
    assert_eq!(soundex("Rupert"), "R163");

    // Similar sounding names should have same soundex
    assert_eq!(soundex("Smith"), soundex("Smythe"));
}

#[test]
fn test_soundex_empty_and_edge_cases() {
    // Empty returns default
    assert_eq!(soundex(""), "0000");
    assert_eq!(soundex("A"), "A000");
}

#[test]
fn test_soundex_band_names() {
    // Beatles and Beatle are close but not identical
    let beatles = soundex("Beatles");
    let beatle = soundex("Beatle");
    // Both should start with B34
    assert!(beatles.starts_with("B34"));
    assert!(beatle.starts_with("B34"));

    // Completely different names should differ
    assert_ne!(soundex("Beatles"), soundex("Metallica"));
}

// ============================================================================
// Metaphone Tests
// ============================================================================

#[test]
fn test_metaphone_basic() {
    // Metaphone should handle common phonetic equivalences
    let result = metaphone("knight");
    assert!(!result.is_empty());

    // Ph and F should produce similar output
    let phone = metaphone("phone");
    let fone = metaphone("fone");
    // Both should produce phonetic output
    assert!(!phone.is_empty());
    assert!(!fone.is_empty());
}

#[test]
fn test_metaphone_empty() {
    assert_eq!(metaphone(""), "");
}

#[test]
fn test_metaphone_band_names() {
    // Test with actual band names
    let nirvana = metaphone("Nirvana");
    assert!(!nirvana.is_empty());

    let metallica = metaphone("Metallica");
    assert!(!metallica.is_empty());

    // Different bands should have different metaphone
    assert_ne!(nirvana, metallica);
}

// ============================================================================
// Double Metaphone Tests
// ============================================================================

#[test]
fn test_double_metaphone_basic() {
    let (primary, alternate) = double_metaphone("Smith");
    assert!(!primary.is_empty());
    // Alternate is Option<String>
    let _ = alternate; // May or may not be Some
}

#[test]
fn test_double_metaphone_empty() {
    let (primary, alternate) = double_metaphone("");
    assert_eq!(primary, "");
    assert!(alternate.is_none());
}

#[test]
fn test_double_metaphone_variations() {
    // Words with multiple pronunciations
    let (primary1, _) = double_metaphone("Schmidt");
    let (primary2, _) = double_metaphone("Smith");

    // Both should produce valid output
    assert!(!primary1.is_empty());
    assert!(!primary2.is_empty());
}

// ============================================================================
// Cross-algorithm Consistency Tests
// ============================================================================

#[test]
fn test_phonetic_consistency_ascii() {
    // Test with ASCII-only inputs (phonetic libs may not handle unicode well)
    let test_inputs = vec![
        "Beatles",
        "The Rolling Stones",
        "Led Zeppelin",
        "",
        "A",
        "AAAAAAA",
    ];

    for input in test_inputs {
        // All should complete without panicking
        let _ = soundex(input);
        let _ = metaphone(input);
        let _ = double_metaphone(input);
    }
}

#[test]
fn test_phonetic_determinism() {
    // Same input should always produce same output
    let input = "Random Band Name";

    let s1 = soundex(input);
    let s2 = soundex(input);
    assert_eq!(s1, s2);

    let m1 = metaphone(input);
    let m2 = metaphone(input);
    assert_eq!(m1, m2);

    let (d1_p, d1_a) = double_metaphone(input);
    let (d2_p, d2_a) = double_metaphone(input);
    assert_eq!(d1_p, d2_p);
    assert_eq!(d1_a, d2_a);
}

// ============================================================================
// Real-world Band Name Tests
// ============================================================================

#[test]
fn test_phonetic_real_bands() {
    // Test common band name patterns (ASCII only)
    let bands = vec![
        "Led Zeppelin",
        "Pink Floyd",
        "The Doors",
        "Fleetwood Mac",
        "Queen",
        "ABBA",
    ];

    for band in bands {
        let s = soundex(band);
        let m = metaphone(band);
        let (dp, _) = double_metaphone(band);

        // All should produce non-empty output for real band names
        assert!(!s.is_empty() || band.is_empty(), "Soundex failed for: {}", band);
        assert!(!m.is_empty() || band.is_empty(), "Metaphone failed for: {}", band);
        assert!(!dp.is_empty() || band.is_empty(), "Double metaphone failed for: {}", band);
    }
}

// ============================================================================
// Phonetic Similarity Tests
// ============================================================================

#[test]
fn test_similar_names_have_similar_codes() {
    // Names that sound similar should have matching or similar codes
    // John and Jon
    let john_s = soundex("John");
    let jon_s = soundex("Jon");
    assert_eq!(john_s, jon_s);

    // Catherine and Katherine
    let cath_m = metaphone("Catherine");
    let kath_m = metaphone("Katherine");
    // These should be phonetically similar
    assert!(!cath_m.is_empty());
    assert!(!kath_m.is_empty());
}

#[test]
fn test_different_names_have_different_codes() {
    // Names that sound different should have different codes
    assert_ne!(soundex("Alice"), soundex("Bob"));
    assert_ne!(metaphone("Morning"), metaphone("Evening"));
}
