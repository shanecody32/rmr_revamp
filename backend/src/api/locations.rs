use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use crate::services::location_service::LocationService;
use crate::job_state::AppState;
use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/search", get(search_locations))
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct LocationSearchParams {
    pub query: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct LocationResponse {
    pub id: u32,
    pub name: String,
    pub r#type: String, // "city", "state", "country"
    pub country_id: Option<u32>,
    pub state_id: Option<u32>,
}

#[utoipa::path(
    get,
    path = "/locations/search",
    params(
        LocationSearchParams
    ),
    responses(
        (status = 200, description = "Search locations", body = [LocationResponse]),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn search_locations(
    State(state): State<AppState>,
    Query(params): Query<LocationSearchParams>,
) -> impl IntoResponse {
    // This is a complex search across countries, states, and cities
    // For now, let's just return an empty list or a very simple implementation
    let mut results = Vec::new();

    // Search countries
    if let Ok(countries) = LocationService::get_countries(&state.db).await {
        for c in countries {
            if let Some(name) = c.name
                && name.to_lowercase().contains(&params.query.to_lowercase()) {
                    results.push(LocationResponse {
                        id: c.id,
                        name,
                        r#type: "country".to_string(),
                        country_id: Some(c.id),
                        state_id: None,
                    });
                }
        }
    }

    // Search states
    if let Ok(states) = LocationService::get_states(&state.db, None).await {
        for s in states {
            if let Some(name) = s.name
                && name.to_lowercase().contains(&params.query.to_lowercase()) {
                    results.push(LocationResponse {
                        id: s.id,
                        name,
                        r#type: "state".to_string(),
                        country_id: s.country_id,
                        state_id: Some(s.id),
                    });
                }
        }
    }

    // Search cities (limited to top 50 for performance in this simple impl)
    if let Ok(cities) = LocationService::get_cities(&state.db, None, None).await {
        for c in cities {
            if let Some(name) = c.name
                && name.to_lowercase().contains(&params.query.to_lowercase()) {
                    results.push(LocationResponse {
                        id: c.id,
                        name,
                        r#type: "city".to_string(),
                        country_id: c.country_id,
                        state_id: c.state_id,
                    });
                }
            if results.len() > 100 { break; }
        }
    }

    (StatusCode::OK, Json(results)).into_response()
}
