//! Tests for similarity search components.
//!
//! Tests phonetic key generation, similarity scoring, fuzzy filtering,
//! and end-to-end sanitize→score pipelines with real-world band names.

use backend::utils::similarity::keys::{soundex, metaphone, double_metaphone};
use backend::utils::similarity::pipeline::{calculate_similarity_score, fuzzy_filter_models};
use backend::utils::slug::{sanitize_name, slug_it, extract_search_terms};

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

// ============================================================================
// Slug & Sanitize Additional Tests
// ============================================================================

#[test]
fn test_sanitize_lowercases() {
    assert_eq!(sanitize_name("Hello World"), "hello world");
}

#[test]
fn test_sanitize_strips_punctuation() {
    assert_eq!(sanitize_name("Rock!@#$%"), "rock");
}

#[test]
fn test_sanitize_preserves_ampersand() {
    assert_eq!(sanitize_name("Simon & Garfunkel"), "simon & garfunkel");
}

#[test]
fn test_sanitize_preserves_numbers() {
    assert_eq!(sanitize_name("Blink 182"), "blink 182");
}

#[test]
fn test_sanitize_trims_outer_whitespace() {
    let result = sanitize_name("  too   many  ");
    assert!(!result.starts_with(' '));
    assert!(!result.ends_with(' '));
    assert!(result.contains("too"));
    assert!(result.contains("many"));
}

#[test]
fn test_sanitize_empty_input() {
    assert_eq!(sanitize_name(""), "");
}

#[test]
fn test_slug_underscores_to_hyphens() {
    assert_eq!(slug_it("my_band"), "my-band");
}

#[test]
fn test_slug_feat_dot_to_featuring() {
    let result = slug_it("Band feat. Guest");
    assert!(result.contains("featuring"), "Expected 'featuring' in slug, got: {}", result);
}

#[test]
fn test_slug_standalone_ft_to_featuring() {
    let result = slug_it("Band ft Someone");
    assert!(result.contains("featuring"), "Expected 'featuring' in slug, got: {}", result);
}

#[test]
fn test_slug_abbreviation_collapse() {
    let result = slug_it("D.J. Shadow");
    assert!(
        result.starts_with("dj") || result.starts_with("d-j"),
        "Expected abbreviation collapse, got: {}",
        result
    );
}

#[test]
fn test_slug_apostrophe_handling() {
    let result = slug_it("Dolly's Band");
    assert!(!result.contains('\''), "Apostrophe should be removed, got: {}", result);
    assert!(result.contains("dolly"), "Got: {}", result);
}

#[test]
fn test_slug_unicode_diacritics() {
    assert_eq!(slug_it("Mötley Crüe"), "motley-crue");
}

#[test]
fn test_extract_simple_name() {
    let terms = extract_search_terms("Metallica");
    assert!(terms.contains(&"metallica".to_string()));
}

#[test]
fn test_extract_strips_the_prefix() {
    let terms = extract_search_terms("The Beatles");
    assert!(terms.contains(&"the beatles".to_string()));
    assert!(terms.contains(&"beatles".to_string()));
}

#[test]
fn test_extract_splits_on_ampersand() {
    let terms = extract_search_terms("Devon Allman & Nightvision");
    assert!(terms.contains(&"devon allman".to_string()), "Got: {:?}", terms);
    assert!(terms.contains(&"nightvision".to_string()), "Got: {:?}", terms);
}

#[test]
fn test_extract_splits_on_feat() {
    let terms = extract_search_terms("DJ feat MC Flow");
    let has_dj = terms.iter().any(|t| t.contains("dj"));
    assert!(has_dj, "Should contain part before feat, got: {:?}", terms);
    let has_flow = terms.iter().any(|t| t.contains("flow"));
    assert!(has_flow, "Should contain part after feat, got: {:?}", terms);
}

#[test]
fn test_extract_significant_words() {
    let terms = extract_search_terms("Red Hot Chili Peppers");
    assert!(terms.contains(&"chili".to_string()), "Got: {:?}", terms);
    assert!(terms.contains(&"peppers".to_string()), "Got: {:?}", terms);
}

#[test]
fn test_extract_possessives() {
    let terms = extract_search_terms("Devon Allman's Honeytribe");
    let has_without = terms.iter().any(|t| t == "devon allman honeytribe");
    assert!(has_without, "Should include version without possessive, got: {:?}", terms);
}

// ============================================================================
// Scoring Tests — real-world band name pairs through sanitize→score
// ============================================================================

/// Helper: sanitize both names then score with default weights and threshold 40
fn score(a: &str, b: &str) -> Option<i32> {
    let sa = sanitize_name(a);
    let sb = sanitize_name(b);
    calculate_similarity_score(&sa, &sb, 0.5, 0.5, 40)
}

#[test]
fn test_score_exact_after_sanitization() {
    // "AC/DC" → "ac dc", "AC DC" → "ac dc"
    let s = score("AC/DC", "AC DC");
    assert_eq!(s, Some(100), "AC/DC vs AC DC after sanitize should be 100");
}

#[test]
fn test_score_common_misspelling() {
    let s = score("Led Zeplin", "Led Zeppelin");
    assert!(s.is_some(), "Misspelling should still match");
    assert!(s.unwrap() >= 40, "Score should be >= 40, got {}", s.unwrap());
}

#[test]
fn test_score_prefix_variation_the() {
    let s = score("The Rolling Stones", "Rolling Stones");
    assert!(s.is_some(), "The-prefix variation should match");
    assert!(s.unwrap() >= 70, "Score should be high, got {}", s.unwrap());
}

#[test]
fn test_score_feat_suffix() {
    let s = score("Willie Nelson", "Willie Nelson feat Dolly Parton");
    assert!(s.is_some(), "Contains relationship should match");
}

#[test]
fn test_score_completely_different() {
    let s = score("Metallica", "Taylor Swift");
    assert!(s.is_none(), "Completely different names should be None, got {:?}", s);
}

#[test]
fn test_score_case_insensitive_exact() {
    let s = score("BEYONCE", "beyonce");
    assert_eq!(s, Some(100), "Case-insensitive exact match should be 100");
}

#[test]
fn test_score_ampersand_vs_and() {
    let s = score("Simon & Garfunkel", "Simon and Garfunkel");
    assert!(s.is_some(), "Ampersand vs 'and' should match, got None");
}

#[test]
fn test_score_single_word_typo() {
    let s = score("Adele", "Adelle");
    assert!(s.is_some(), "Single-letter typo should match");
    assert!(s.unwrap() >= 60, "Score should be high for typo, got {}", s.unwrap());
}

#[test]
fn test_score_short_contained_in_long() {
    let sa = sanitize_name("U2");
    let sb = sanitize_name("U2 Band");
    let s = calculate_similarity_score(&sa, &sb, 0.5, 0.5, 0);
    assert!(s.is_some(), "Short name contained in long should match");
}

#[test]
fn test_score_numbers_in_name() {
    let sa = sanitize_name("Blink 182");
    let sb = sanitize_name("Blink182");
    let s = calculate_similarity_score(&sa, &sb, 0.5, 0.5, 0);
    assert!(s.is_some(), "Number spacing variation should match");
    assert!(s.unwrap() >= 70, "Score should be high, got {}", s.unwrap());
}

#[test]
fn test_score_multi_word_reorder_jaccard() {
    let s = score("Earth Wind and Fire", "Fire Wind and Earth");
    assert!(s.is_some(), "Reordered words should match via Jaccard bonus");
    assert!(s.unwrap() >= 60, "Jaccard bonus should boost score, got {}", s.unwrap());
}

#[test]
fn test_score_high_threshold_filters() {
    let sa = sanitize_name("Led Zeplin");
    let sb = sanitize_name("Led Zeppelin");
    let s = calculate_similarity_score(&sa, &sb, 0.5, 0.5, 99);
    assert!(s.is_none(), "Misspelling should not reach threshold 99, got {:?}", s);
}

// ============================================================================
// Fuzzy Filter Tests — fuzzy_filter_models with simple models
// ============================================================================

#[derive(Debug, Clone)]
struct FakeModel {
    name: String,
}

impl FakeModel {
    fn new(name: &str) -> Self {
        Self { name: name.to_string() }
    }
}

#[tokio::test]
async fn test_fuzzy_empty_input_returns_empty() {
    let results = fuzzy_filter_models(
        Vec::<FakeModel>::new(),
        "metallica",
        40, 0.5, 0.5,
        |m: &FakeModel| m.name.clone(),
    ).await;
    assert!(results.is_empty());
}

#[tokio::test]
async fn test_fuzzy_all_below_threshold_returns_empty() {
    let models = vec![
        FakeModel::new("Taylor Swift"),
        FakeModel::new("Ariana Grande"),
    ];
    let results = fuzzy_filter_models(
        models,
        "metallica",
        40, 0.5, 0.5,
        |m: &FakeModel| m.name.clone(),
    ).await;
    assert!(results.is_empty(), "Unrelated names should all be below threshold");
}

#[tokio::test]
async fn test_fuzzy_exact_match_ranked_first() {
    let models = vec![
        FakeModel::new("Metalica"),
        FakeModel::new("Metallica"),
        FakeModel::new("Metallic"),
    ];
    let results = fuzzy_filter_models(
        models,
        "metallica",
        40, 0.5, 0.5,
        |m: &FakeModel| m.name.clone(),
    ).await;
    assert!(!results.is_empty(), "Should have matches");
    assert_eq!(results[0].0.name, "Metallica", "Exact match should be first");
    assert_eq!(results[0].1, 100, "Exact match should score 100");
}

#[tokio::test]
async fn test_fuzzy_multiple_matches_sorted_descending() {
    let models = vec![
        FakeModel::new("Led Zeplin"),
        FakeModel::new("Led Zeppelin"),
        FakeModel::new("Led Zep"),
    ];
    let results = fuzzy_filter_models(
        models,
        "led zeppelin",
        40, 0.5, 0.5,
        |m: &FakeModel| m.name.clone(),
    ).await;
    assert!(results.len() >= 2, "Should have at least 2 matches, got {}", results.len());
    for i in 1..results.len() {
        assert!(
            results[i - 1].1 >= results[i].1,
            "Results should be sorted descending: {} >= {}",
            results[i - 1].1,
            results[i].1
        );
    }
}

#[tokio::test]
async fn test_fuzzy_single_match_returned() {
    let models = vec![
        FakeModel::new("Metallica"),
        FakeModel::new("Taylor Swift"),
        FakeModel::new("Ariana Grande"),
    ];
    let results = fuzzy_filter_models(
        models,
        "metallica",
        40, 0.5, 0.5,
        |m: &FakeModel| m.name.clone(),
    ).await;
    assert_eq!(results.len(), 1, "Only exact match should pass threshold");
    assert_eq!(results[0].0.name, "Metallica");
}

#[tokio::test]
async fn test_fuzzy_mixed_above_and_below_threshold() {
    let models = vec![
        FakeModel::new("Metallica"),
        FakeModel::new("Metalica"),
        FakeModel::new("Taylor Swift"),
        FakeModel::new("Megadeth"),
    ];
    let results = fuzzy_filter_models(
        models,
        "metallica",
        40, 0.5, 0.5,
        |m: &FakeModel| m.name.clone(),
    ).await;
    let names: Vec<&str> = results.iter().map(|(m, _)| m.name.as_str()).collect();
    assert!(names.contains(&"Metallica"), "Exact match should be included");
    assert!(names.contains(&"Metalica"), "Close typo should be included");
    assert!(!names.contains(&"Taylor Swift"), "Unrelated should be excluded");
}

// ============================================================================
// Phonetic Cross-Function Homophone Tests
// ============================================================================

#[test]
fn test_soundex_jon_equals_john() {
    assert_eq!(soundex("Jon"), soundex("John"), "Jon and John should have same soundex");
}

#[test]
fn test_metaphone_katherine_equals_catherine() {
    // Soundex uses the first letter literally (K vs C), so these differ.
    // Metaphone encodes phonetically: both start with K sound.
    assert_eq!(
        metaphone("Katherine"),
        metaphone("Catherine"),
        "Katherine and Catherine should have same metaphone"
    );
}

#[test]
fn test_metaphone_wright_equals_right() {
    assert_eq!(
        metaphone("Wright"),
        metaphone("Right"),
        "Wright and Right should have same metaphone"
    );
}

#[test]
fn test_double_metaphone_schmidt_and_smith_share_consonant_structure() {
    // Schmidt → XMT/SMT, Smith → SM0/XMT
    // Double Metaphone captures alternate pronunciations.
    // Schmidt's alternate "SMT" and Smith's primary "SM0" both start with SM,
    // and Schmidt's primary "XMT" matches Smith's alternate "XMT".
    let (schmidt_primary, schmidt_alt) = double_metaphone("Schmidt");
    let (smith_primary, smith_alt) = double_metaphone("Smith");
    // Check if any combination of primary/alternate keys match
    let matches = schmidt_primary == smith_primary
        || schmidt_alt.as_deref() == Some(&smith_primary)
        || Some(schmidt_primary.as_str()) == smith_alt.as_deref()
        || (schmidt_alt.is_some() && schmidt_alt == smith_alt);
    assert!(
        matches,
        "Schmidt ({:?}/{:?}) should share a key with Smith ({:?}/{:?})",
        schmidt_primary, schmidt_alt, smith_primary, smith_alt
    );
}

#[test]
fn test_soundex_guns_n_roses_variations() {
    let s1 = soundex("Guns N Roses");
    let s2 = soundex("Guns and Roses");
    assert_eq!(s1, s2, "Guns N Roses vs Guns and Roses soundex");
}

#[test]
fn test_metaphone_led_zeppelin_misspelling() {
    let m1 = metaphone("Led Zeppelin");
    let m2 = metaphone("Led Zeplin");
    assert_eq!(m1, m2, "Led Zeppelin vs Led Zeplin metaphone should match");
}

#[test]
fn test_double_metaphone_def_leppard_misspelling() {
    let (p1, _) = double_metaphone("Def Leppard");
    let (p2, _) = double_metaphone("Def Lepard");
    assert_eq!(p1, p2, "Def Leppard vs Def Lepard double metaphone primary should match");
}
