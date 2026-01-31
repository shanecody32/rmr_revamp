use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use crate::services::location_service::LocationService;
use crate::services::types::{SimilarityParams, SimilarResult};
use crate::job_state::AppState;
use crate::models::postal_codes::Model as PostalCode;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/similar", get(get_similar_postal_codes))
}

#[utoipa::path(
    get,
    path = "/postal_codes/similar",
    params(
        SimilarityParams
    ),
    responses(
        (status = 200, description = "List similar postal codes", body = [SimilarResult<PostalCode>]),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn get_similar_postal_codes(
    State(state): State<AppState>,
    Query(params): Query<SimilarityParams>,
) -> impl IntoResponse {
    match LocationService::get_similar_postal_codes(&state.db, params).await {
        Ok(results) => (StatusCode::OK, Json(results)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}
