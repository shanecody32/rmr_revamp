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
}
