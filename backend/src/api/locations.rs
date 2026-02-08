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

    let query_name = Some(params.query.clone());

    // Search countries
    if let Ok(paginated) = LocationService::get_countries(&state.db, query_name.clone(), None, 1, 50).await {
        for c in paginated.results {
            if let Some(name) = c.name {
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
    if let Ok(paginated) = LocationService::get_states(&state.db, None, query_name.clone(), None, 1, 50).await {
        for s in paginated.results {
            if let Some(name) = s.name {
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

    // Search cities
    if let Ok(paginated) = LocationService::get_cities(&state.db, None, None, query_name, None, 1, 50).await {
        for c in paginated.results {
            if let Some(name) = c.name {
                results.push(LocationResponse {
                    id: c.id,
                    name,
                    r#type: "city".to_string(),
                    country_id: c.country_id,
                    state_id: c.state_id,
                });
            }
        }
    }

    (StatusCode::OK, Json(results)).into_response()
}
