use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post, patch, delete},
    Json, Router,
};
use crate::services::band_service::BandService;
use crate::job_state::AppState;
use crate::models::band_images::Model as BandImage;
use serde::Deserialize;
use utoipa::ToSchema;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/upload", post(upload_band_image))
        .route("/reorder", post(reorder_band_images))
        .route("/{id}", get(get_band_image))
        .route("/{id}", patch(update_band_image))
        .route("/{id}", delete(delete_band_image))
        .route("/{band_id}/list", get(list_band_images))
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct BandImageUpdate {
    pub _order: i32,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct ReorderUpdate {
    pub _id: u32,
    pub _order: i32,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct ReorderRequest {
    pub _updates: Vec<ReorderUpdate>,
}

#[utoipa::path(
    post,
    path = "/band_images/upload",
    responses(
        (status = 201, description = "Image uploaded", body = BandImage),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn upload_band_image(State(_state): State<AppState>) -> impl IntoResponse {
    // Mock implementation
    (StatusCode::NOT_IMPLEMENTED, "Not implemented").into_response()
}

#[utoipa::path(
    get,
    path = "/band_images/{id}",
    params(
        ("id" = i32, Path, description = "Image id")
    ),
    responses(
        (status = 200, description = "Image found", body = BandImage),
        (status = 404, description = "Image not found")
    )
)]
pub(crate) async fn get_band_image(State(_state): State<AppState>, Path(_id): Path<u32>) -> impl IntoResponse {
    (StatusCode::NOT_IMPLEMENTED, "Not implemented").into_response()
}

#[utoipa::path(
    get,
    path = "/band_images/{band_id}/list",
    params(
        ("band_id" = i32, Path, description = "Band id")
    ),
    responses(
        (status = 200, description = "List band images", body = [BandImage])
    )
)]
pub(crate) async fn list_band_images(State(state): State<AppState>, Path(band_id): Path<u32>) -> impl IntoResponse {
    match BandService::get_band_images(&state.db, band_id).await {
        Ok(images) => (StatusCode::OK, Json(images)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

#[utoipa::path(
    patch,
    path = "/band_images/{id}",
    params(
        ("id" = i32, Path, description = "Image id")
    ),
    request_body = BandImageUpdate,
    responses(
        (status = 200, description = "Image updated", body = BandImage)
    )
)]
pub(crate) async fn update_band_image(
    State(_state): State<AppState>,
    Path(_id): Path<u32>,
    Json(_data): Json<BandImageUpdate>,
) -> impl IntoResponse {
    (StatusCode::NOT_IMPLEMENTED, "Not implemented").into_response()
}

#[utoipa::path(
    delete,
    path = "/band_images/{id}",
    params(
        ("id" = i32, Path, description = "Image id")
    ),
    responses(
        (status = 204, description = "Image deleted")
    )
)]
pub(crate) async fn delete_band_image(State(_state): State<AppState>, Path(_id): Path<u32>) -> impl IntoResponse {
    (StatusCode::NOT_IMPLEMENTED, "Not implemented").into_response()
}

#[utoipa::path(
    post,
    path = "/band_images/reorder",
    request_body = ReorderRequest,
    responses(
        (status = 200, description = "Images reordered")
    )
)]
pub(crate) async fn reorder_band_images(State(_state): State<AppState>, Json(_req): Json<ReorderRequest>) -> impl IntoResponse {
    (StatusCode::NOT_IMPLEMENTED, "Not implemented").into_response()
}
