use serde::{Deserialize, Serialize};
use utoipa::{ToSchema, IntoParams};

// Re-export from views for backward compatibility
pub use crate::views::common::{PaginatedResponse, PaginationInfo, PaginationParams};

#[derive(Debug, Clone, Deserialize, IntoParams, Serialize, Default)]
#[serde(default)]
pub struct SimilarityParams {
    pub search_term: String,
    pub existing_id: Option<u32>,
    pub jw_weight: Option<f64>,
    pub dice_weight: Option<f64>,
    pub min_similarity: Option<i32>,
    pub limit: Option<usize>,
    pub band_id: Option<u32>,
    pub album_id: Option<u32>,
    pub radio_station_id: Option<u32>,
    pub country_id: Option<u32>,
    pub state_id: Option<u32>,
    pub city_id: Option<u32>,
    pub postal_code_id: Option<u32>,
    pub restrict_to_parent: Option<bool>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct SimilarResult<T> {
    #[serde(flatten)]
    pub model: T,
    pub similarity_score: i32,
}
