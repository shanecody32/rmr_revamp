use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use crate::services::label_service::{LabelService, MergeLabelsRequest};
use crate::services::types::{SimilarityParams, SimilarResult};
use crate::job_state::AppState;
use crate::models::labels::Model as Label;
use crate::utils::error::handle_internal_error;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/similar", get(get_similar_labels))
        .route("/merge", post(merge_labels))
}

#[utoipa::path(
    get,
    path = "/labels/similar",
    params(
        SimilarityParams
    ),
    responses(
        (status = 200, description = "List similar labels", body = [SimilarResult<Label>]),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn get_similar_labels(
    State(state): State<AppState>,
    Query(params): Query<SimilarityParams>,
) -> impl IntoResponse {
    match LabelService::get_similar_labels(&state.db, params).await {
        Ok(results) => (StatusCode::OK, Json(results)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

pub(crate) async fn merge_labels(State(state): State<AppState>, Json(req): Json<MergeLabelsRequest>) -> impl IntoResponse {
    // TODO: Extract user_id and ip_address from auth context when auth is implemented
    let user_id: Option<u32> = None;
    let ip_address: Option<String> = None;

    match LabelService::merge_labels(&state.db, req, user_id, ip_address).await {
        Ok(result) => (StatusCode::OK, Json(result)).into_response(),
        Err(e) => handle_internal_error(e),
    }
}
