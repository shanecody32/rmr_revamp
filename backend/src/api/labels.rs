use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post, put},
    Json, Router,
};
use crate::services::label_service::{LabelService, LabelFilterParams, LabelResponse, CreateLabelRequest, UpdateLabelRequest, MergeLabelsRequest};
use crate::services::types::{PaginatedResponse, SimilarityParams, SimilarResult};
use crate::job_state::AppState;
use crate::models::labels::Model as Label;
use crate::utils::error::handle_internal_error;
use sea_orm::DbErr;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(get_labels))
        .route("/", post(create_label))
        .route("/similar", get(get_similar_labels))
        .route("/merge", post(merge_labels))
        .route("/{id}", get(get_label))
        .route("/{id}", put(update_label))
}

#[utoipa::path(
    get,
    path = "/labels",
    params(
        LabelFilterParams
    ),
    responses(
        (status = 200, description = "List all labels", body = PaginatedResponse<LabelResponse>),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn get_labels(
    State(state): State<AppState>,
    Query(params): Query<LabelFilterParams>,
) -> impl IntoResponse {
    match LabelService::get_labels(&state.db, params).await {
        Ok(paginated) => (StatusCode::OK, Json(paginated)).into_response(),
        Err(e) => handle_internal_error(e),
    }
}

#[utoipa::path(
    post,
    path = "/labels",
    request_body = CreateLabelRequest,
    responses(
        (status = 201, description = "Label created", body = LabelResponse),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn create_label(
    State(state): State<AppState>,
    Json(data): Json<CreateLabelRequest>,
) -> impl IntoResponse {
    match LabelService::create_label(&state.db, data).await {
        Ok(label) => (StatusCode::CREATED, Json(label)).into_response(),
        Err(e) => handle_internal_error(e),
    }
}

#[utoipa::path(
    get,
    path = "/labels/{id}",
    params(
        ("id" = u32, Path, description = "Label database id")
    ),
    responses(
        (status = 200, description = "Label found", body = LabelResponse),
        (status = 404, description = "Label not found"),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn get_label(
    State(state): State<AppState>,
    Path(id): Path<u32>,
) -> impl IntoResponse {
    match LabelService::get_label_by_id(&state.db, id).await {
        Ok(Some(label)) => (StatusCode::OK, Json(label)).into_response(),
        Ok(None) => (StatusCode::NOT_FOUND, "Label not found").into_response(),
        Err(e) => handle_internal_error(e),
    }
}

#[utoipa::path(
    put,
    path = "/labels/{id}",
    params(
        ("id" = u32, Path, description = "Label database id")
    ),
    request_body = UpdateLabelRequest,
    responses(
        (status = 200, description = "Label updated", body = LabelResponse),
        (status = 404, description = "Label not found"),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn update_label(
    State(state): State<AppState>,
    Path(id): Path<u32>,
    Json(data): Json<UpdateLabelRequest>,
) -> impl IntoResponse {
    match LabelService::update_label(&state.db, id, data).await {
        Ok(label) => (StatusCode::OK, Json(label)).into_response(),
        Err(DbErr::RecordNotFound(msg)) => (StatusCode::NOT_FOUND, msg).into_response(),
        Err(e) => handle_internal_error(e),
    }
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
