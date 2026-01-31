pub struct SimilarityScope {
    pub band_id: Option<u32>,
    pub album_id: Option<u32>,
    pub radio_station_id: Option<u32>,
    pub country_id: Option<u32>,
    pub state_id: Option<u32>,
    pub city_id: Option<u32>,
    pub postal_code_id: Option<u32>,
    pub restrict_to_parent: bool,
}

use crate::services::types::SimilarityParams;

impl From<&SimilarityParams> for SimilarityScope {
    fn from(params: &SimilarityParams) -> Self {
        Self {
            band_id: params.band_id,
            album_id: params.album_id,
            radio_station_id: params.radio_station_id,
            country_id: params.country_id,
            state_id: params.state_id,
            city_id: params.city_id,
            postal_code_id: params.postal_code_id,
            restrict_to_parent: params.restrict_to_parent.unwrap_or(false),
        }
    }
}
