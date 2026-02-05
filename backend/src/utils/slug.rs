use num2words::{Lang, Num2Words};
use once_cell::sync::Lazy;
use regex::Regex;
use std::collections::HashMap;
use unicode_normalization::char::is_combining_mark;
use unicode_normalization::UnicodeNormalization;

// Precompiled regex for commonly used symbols that will be replaced
static RE_COMMON: Lazy<Regex> = Lazy::new(|| Regex::new(r"[&/\\+=@%?^*]").unwrap());
// Precompiled regex for invalid characters that will be removed
static RE_INVALID_CHARS: Lazy<Regex> = Lazy::new(|| Regex::new(r"[',()<>|{}\[\]\\;:@&!]").unwrap());
// Precompiled regex for non-alphanumeric characters, excluding spaces and hyphens
static RE_NON_ALPHANUMERIC: Lazy<Regex> = Lazy::new(|| Regex::new(r"[^a-zA-Z0-9\s-]").unwrap());
// Precompiled regex for multiple consecutive spaces
static RE_SPACE: Lazy<Regex> = Lazy::new(|| Regex::new(r"\s{2,}").unwrap());
// Precompiled regex for multiple consecutive hyphens
static RE_HYPHEN: Lazy<Regex> = Lazy::new(|| Regex::new(r"-{2,}").unwrap());
// Precompiled regex for identifying numbers (integers and decimals)
static RE_NUMBERS: Lazy<Regex> = Lazy::new(|| Regex::new(r"\d+(\.\d+)?").unwrap());
// Precompiled regex for abbreviations, such as "e.g."
static RE_ABBREVIATION: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"\b(?:([a-z])\.){1,}([a-z])\.?").unwrap());
// Precompiled regex for identifying periods between letters (e.g., "a.b")
static RE_PERIOD_BETWEEN_LETTERS: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"(?P<letter>[a-zA-Z])\.(?P<next_letter>[a-zA-Z])").unwrap());
// Precompiled regex for identifying "ft" after a number
static RE_FT_AFTER_NUMBER: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"(?i)(\b\d+(\.\d+)?)\s*ft\b").unwrap());
// Precompiled regex for identifying standalone "ft"
static RE_FT: Lazy<Regex> = Lazy::new(|| Regex::new(r"(?i)\bft\b").unwrap());
// Precompiled regex for dollar sign followed by a number
static RE_DOLLAR_BEFORE_NUMBER: Lazy<Regex> = Lazy::new(|| Regex::new(r"\$(\d+(\.\d+)?)").unwrap());
// Precompiled regex for dollar sign followed by a word
static RE_DOLLAR_BEFORE_WORD: Lazy<Regex> = Lazy::new(|| Regex::new(r"\$(\w+)").unwrap());
// Precompiled regex for dollar sign after a word
static RE_DOLLAR_AFTER_WORD: Lazy<Regex> = Lazy::new(|| Regex::new(r"(\w+)\$").unwrap());

// HashMap for replacing common symbols with words
static REPLACEMENTS: Lazy<HashMap<&'static str, &'static str>> = Lazy::new(|| {
    let mut m = HashMap::new();
    m.insert("&", " and ");
    m.insert("/", " and ");
    m.insert("\\", " and ");
    m.insert("+", " plus ");
    m.insert("=", " equals ");
    m.insert("@", " at ");
    m.insert("%", " percent ");
    m.insert("^", " to the power of ");
    m
});

pub fn sanitize_name(name: &str) -> String {
    let re = Regex::new(r"[^a-zA-Z0-9&]").unwrap();
    re.replace_all(&name.to_lowercase(), " ").trim().to_string()
}

/// Regex for splitting on common band name separators
static RE_SEPARATORS: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)\s*(?:&|\+|\band\b|\bor\b|\bwith\b|\bfeat\.?\b|\bfeaturing\b|\bvs\.?\b)\s*").unwrap()
});

/// Regex for "The" at the start (to strip)
static RE_THE_PREFIX: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)^the\s+").unwrap()
});

/// Regex for possessive suffix ('s)
static RE_POSSESSIVE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"'s\b").unwrap()
});

/// Extract search terms for broad similarity matching.
///
/// Given "Devon Allman & Nightvision", returns:
/// - "Devon Allman & Nightvision" (original)
/// - "Devon Allman" (left of separator)
/// - "Nightvision" (right of separator)
/// - "Devon" (significant words >= 4 chars)
/// - "Allman" (significant words >= 4 chars)
///
/// Also strips "The" prefix and handles possessives.
pub fn extract_search_terms(name: &str) -> Vec<String> {
    let mut terms: Vec<String> = Vec::new();
    let mut seen: std::collections::HashSet<String> = std::collections::HashSet::new();

    // Helper to add a term if not already seen
    let mut add_term = |term: &str| {
        let cleaned = term.trim().to_lowercase();
        if !cleaned.is_empty() && cleaned.len() >= 2 && seen.insert(cleaned.clone()) {
            terms.push(cleaned);
        }
    };

    // Original name (lowercased)
    let original = name.trim().to_lowercase();
    add_term(&original);

    // Strip "The" prefix
    let without_the = RE_THE_PREFIX.replace(&original, "").to_string();
    if without_the != original {
        add_term(&without_the);
    }

    // Split on separators (&, +, and, or, with, feat, featuring, vs)
    let parts: Vec<&str> = RE_SEPARATORS.split(&original).collect();
    for part in &parts {
        let trimmed = part.trim();
        if !trimmed.is_empty() {
            add_term(trimmed);

            // Also strip "The" from each part
            let part_without_the = RE_THE_PREFIX.replace(trimmed, "").to_string();
            if part_without_the != trimmed {
                add_term(&part_without_the);
            }

            // Handle possessives: "Devon Allman's Honeytribe" -> "Devon Allman"
            let without_possessive = RE_POSSESSIVE.replace_all(trimmed, "").to_string();
            if without_possessive != trimmed {
                add_term(&without_possessive);
            }
        }
    }

    // Extract individual significant words (4+ chars) for broader matching
    let word_re = Regex::new(r"\b[a-zA-Z]{4,}\b").unwrap();
    for word in word_re.find_iter(&original) {
        let w = word.as_str().to_lowercase();
        // Skip common words
        if !["with", "feat", "featuring", "band", "the"].contains(&w.as_str()) {
            add_term(&w);
        }
    }

    terms
}

// Main function to generate a "slug" from a given string
pub fn slug_it(to_slug: &str) -> String {
    // Trim and convert input to lowercase
    let mut cleaned_slug = to_slug.trim().to_lowercase();
    // Normalize to remove diacritical marks (e.g., accents)
    cleaned_slug = cleaned_slug
        .nfd()
        .filter(|c| !is_combining_mark(*c))
        .collect::<String>();
    // Remove commas
    cleaned_slug = cleaned_slug.replace(',', "");
    // Handle single character replacements, such as special symbols
    cleaned_slug = handle_single_character(&cleaned_slug);
    // Return early if it's just one character after cleaning
    if cleaned_slug.len() == 1 {
        return cleaned_slug.trim().to_string();
    }
    // Handle specific special cases like programming languages (e.g., "c#")
    cleaned_slug = handle_special_cases(&cleaned_slug);
    // Replace underscores with hyphens
    cleaned_slug = cleaned_slug.replace('_', "-");
    // Handle dollar signs in the input string
    cleaned_slug = handle_dollar_signs(&cleaned_slug);
    // Replace abbreviations with a concatenation of the letters (e.g., "e.g." -> "eg")
    cleaned_slug = RE_ABBREVIATION
        .replace_all(&cleaned_slug, replace_abbreviation)
        .to_string();
    // Replace periods between letters with hyphens (e.g., "a.b" -> "a-b")
    cleaned_slug = RE_PERIOD_BETWEEN_LETTERS
        .replace_all(&cleaned_slug, "${letter}-${next_letter}")
        .to_string();
    // Replace special characters using predefined replacements
    cleaned_slug = replace_special_characters(&cleaned_slug, &RE_COMMON).to_string();
    // Replace "feat." with "featuring"
    cleaned_slug = cleaned_slug.replace(" feat.", " featuring");
    // Replace sharp symbol (#) with "sharp-"
    cleaned_slug = cleaned_slug.replace('#', "sharp-");
    // Replace double hyphens with a single hyphen
    cleaned_slug = cleaned_slug.replace("--", "-");
    // Replace "ft" after numbers with "foot"
    cleaned_slug = RE_FT_AFTER_NUMBER
        .replace_all(&cleaned_slug, |caps: &regex::Captures| {
            let number = &caps[1];
            format!("{} foot", number)
        })
        .to_string();
    // Replace standalone "ft" with "featuring"
    cleaned_slug = RE_FT.replace_all(&cleaned_slug, "featuring").to_string();
    // Convert numbers to their word equivalents
    cleaned_slug = convert_numbers_to_words(&cleaned_slug);
    // Remove periods from the string
    cleaned_slug = cleaned_slug.replace('.', "");
    // Remove invalid characters
    cleaned_slug = RE_INVALID_CHARS.replace_all(&cleaned_slug, "").to_string();
    // Remove remaining non-alphanumeric characters
    cleaned_slug = RE_NON_ALPHANUMERIC
        .replace_all(&cleaned_slug, "")
        .to_string();
    // Replace multiple spaces with a single space
    cleaned_slug = RE_SPACE.replace_all(&cleaned_slug, " ").to_string();
    // Remove leading "the" from the string
    if cleaned_slug.starts_with("the ") {
        cleaned_slug = cleaned_slug.trim_start_matches("the ").to_string();
    }
    // Replace spaces with hyphens
    cleaned_slug = cleaned_slug.replace(' ', "-");
    // Replace multiple consecutive hyphens with a single hyphen
    cleaned_slug = RE_HYPHEN.replace_all(&cleaned_slug, "-").to_string();
    // Trim hyphens from the beginning and end
    cleaned_slug.trim_matches('-').to_string()
}

// Function to replace special characters with corresponding words
fn replace_special_characters(slug: &str, re: &Regex) -> String {
    re.replace_all(slug, |caps: &regex::Captures| {
        REPLACEMENTS.get(&caps[0]).unwrap_or(&"").to_string()
    })
    .to_string()
}

// Function to handle specific special cases like "c#", "f#", "c++"
fn handle_special_cases(slug: &str) -> String {
    slug.replace("c#", "c-sharp")
        .replace("f#", "f-sharp")
        .replace("c++", "c-plus-plus")
}

// Function to replace abbreviations by concatenating the letters
fn replace_abbreviation(caps: &regex::Captures) -> String {
    let mut abbreviation = String::new();
    for i in 1..caps.len() {
        if let Some(letter) = caps.get(i) {
            abbreviation.push_str(letter.as_str());
        }
    }
    abbreviation
}

// Function to handle single-character inputs and replace them with corresponding words
fn handle_single_character(slug: &str) -> String {
    if slug.len() == 1 {
        match slug {
            "#" => "sharp".to_string(),
            "&" | "/" | "\\" => "and".to_string(),
            "+" => "plus".to_string(),
            "$" => "dollar".to_string(),
            "^" => "to-the-power-of".to_string(),
            "?" => "question".to_string(),
            "<" => "less".to_string(),
            ">" => "greater".to_string(),
            "{" | "}" => "brace".to_string(),
            "|" => "pipe".to_string(),
            "[" | "]" => "bracket".to_string(),
            "*" => "asterisk".to_string(),
            ";" => "semicolon".to_string(),
            ":" => "colon".to_string(),
            "=" => "equals".to_string(),
            "@" => "at".to_string(),
            "!" => "exclamation".to_string(),
            _ => slug.to_string(),
        }
    } else {
        slug.to_string()
    }
}

// Function to convert numbers to words, e.g., "123" -> "one hundred twenty-three"
fn convert_numbers_to_words(input: &str) -> String {
    RE_NUMBERS
        .replace_all(input, |caps: &regex::Captures| {
            let num_str = &caps[0];
            let parts: Vec<&str> = num_str.split('.').collect();
            let word_parts: Vec<String> = parts
                .iter()
                .map(|part| convert_part_to_words(part))
                .collect();
            word_parts.join(" ")
        })
        .to_string()
}

// Helper function to convert a single part of a number to words
fn convert_part_to_words(part: &str) -> String {
    match part.parse::<u64>() {
        Ok(number) => Num2Words::new(number)
            .lang(Lang::English)
            .to_words()
            .unwrap_or_else(|_| number.to_string()),
        Err(_) => "invalid-number".to_string(),
    }
}

// Function to handle dollar signs and convert them appropriately
fn handle_dollar_signs(slug: &str) -> String {
    // Replace dollar signs before numbers with words (e.g., "$100" -> "one hundred-dollar")
    let cleaned_slug = RE_DOLLAR_BEFORE_NUMBER
        .replace_all(slug, |caps: &regex::Captures| {
            let number = &caps[1];
            match number.parse::<u64>() {
                Ok(num) => {
                    let word_form = Num2Words::new(num)
                        .lang(Lang::English)
                        .to_words()
                        .unwrap_or_else(|_| num.to_string());
                    format!("{}-dollar", word_form)
                }
                Err(_) => "invalid-dollar".to_string(),
            }
        })
        .to_string();
    // Replace dollar signs before words (e.g., "$apple" -> "dollar-apple")
    let cleaned_slug = RE_DOLLAR_BEFORE_WORD
        .replace_all(&cleaned_slug, |caps: &regex::Captures| {
            let word = &caps[1];
            format!("dollar-{}", word)
        })
        .to_string();
    // Replace dollar signs after words (e.g., "apple$" -> "apple-dollar")
    
    RE_DOLLAR_AFTER_WORD
        .replace_all(&cleaned_slug, |caps: &regex::Captures| {
            let word = &caps[1];
            format!("{}-dollar", word)
        })
        .to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_slug_it_basic() {
        assert_eq!(slug_it("The Band Name"), "band-name");
        assert_eq!(slug_it("AC/DC"), "ac-and-dc");
        assert_eq!(slug_it("Beyoncé"), "beyonce");
    }

    #[test]
    fn test_slug_it_numbers() {
        assert_eq!(slug_it("123"), "one-hundred-twenty-three");
        assert_eq!(slug_it("Band 2"), "band-two");
    }

    #[test]
    fn test_slug_it_symbols() {
        assert_eq!(slug_it("C#"), "c-sharp");
        assert_eq!(slug_it("C++"), "c-plus-plus");
        assert_eq!(slug_it("$100"), "one-hundred-dollar");
    }

    #[test]
    fn test_sanitize_name() {
        assert_eq!(sanitize_name("The Band Name!"), "the band name");
        assert_eq!(sanitize_name("AC/DC"), "ac dc");
    }
}
