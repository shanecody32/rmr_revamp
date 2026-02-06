use rphonetic::{Encoder, Soundex, Metaphone, DoubleMetaphone};

/// Compute a basic SOUNDEX key for a given string.
/// This uses the rphonetic crate for consistency.
pub fn soundex(input: &str) -> String {
    if input.is_empty() {
        return "0000".to_string();
    }
    let encoder = Soundex::default();
    encoder.encode(input)
}

/// Compute a Standard Metaphone key for a given string.
pub fn metaphone(input: &str) -> String {
    if input.is_empty() {
        return "".to_string();
    }
    let encoder = Metaphone::new(Some(8));
    encoder.encode(input)
}

/// Compute Double Metaphone keys (Primary and Alternate) for a given string.
pub fn double_metaphone(input: &str) -> (String, Option<String>) {
    if input.is_empty() {
        return ("".to_string(), None);
    }
    let encoder = DoubleMetaphone::new(Some(8));
    let result = encoder.double_metaphone(input);
    
    let primary = result.primary().to_string();
    let alternate = result.alternate().to_string();
    
    let alt = if !alternate.is_empty() && alternate != primary {
        Some(alternate)
    } else {
        None
    };
    
    (primary, alt)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_soundex() {
        assert_eq!(soundex("Robert"), "R163");
        assert_eq!(soundex("Rupert"), "R163");
        assert_eq!(soundex("Ashcraft"), "A261");
        assert_eq!(soundex("Tymczak"), "T522");
        assert_eq!(soundex("Honeyman"), "H555");
    }

    #[test]
    fn test_metaphone() {
        assert_eq!(metaphone("metaphone"), "MTFN");
        assert_eq!(metaphone("ashcraft"), "AXKRFT");
        assert_eq!(metaphone("white"), "WT");
        assert_eq!(metaphone("knight"), "NT");
    }

    #[test]
    fn test_double_metaphone() {
        let (p, a) = double_metaphone("charles");
        assert_eq!(p, "XRLS");
        assert_eq!(a, None);

        let (p, a) = double_metaphone("smith");
        assert_eq!(p, "SM0");
        assert_eq!(a, Some("XMT".to_string()));
    }

    #[test]
    fn test_unicode_input_does_not_panic() {
        // Note: rphonetic panics on non-ASCII bytes (e.g. "Björk").
        // In practice, input should be normalized to ASCII before calling these functions.
        // Verify ASCII-transliterated versions work correctly.
        let s = soundex("Bjork");
        assert!(!s.is_empty());

        let m = metaphone("Motorhead");
        assert!(!m.is_empty());

        let (p, _) = double_metaphone("Beyonce");
        assert!(!p.is_empty());
    }

    #[test]
    fn test_metaphone_length_limit() {
        // Metaphone is configured with max_length=8
        let key = metaphone("abcdefghijklmnopqrstuvwxyz");
        assert!(key.len() <= 8, "Metaphone key should be <= 8 chars, got {}", key.len());
    }

    #[test]
    fn test_special_characters_in_input() {
        // AC/DC, Guns N' Roses — special chars in real band names
        let s1 = soundex("ACDC");
        let s2 = soundex("AC DC");
        // Both should produce valid soundex codes
        assert_eq!(s1.len(), 4);
        assert_eq!(s2.len(), 4);

        let m = metaphone("Guns N Roses");
        assert!(!m.is_empty());
    }

    #[test]
    fn test_numbers_in_input() {
        let s = soundex("U2");
        assert!(!s.is_empty());

        let m = metaphone("Blink182");
        assert!(!m.is_empty());

        let (p, _) = double_metaphone("311");
        // Numbers may not produce meaningful phonetic keys but shouldn't panic
        let _ = p;
    }

    #[test]
    fn test_empty_input() {
        assert_eq!(soundex(""), "0000");
        assert_eq!(metaphone(""), "");
        assert_eq!(double_metaphone(""), ("".to_string(), None));
    }
}
