use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post, put},
    Json, Router,
};
use crate::services::band_service::{BandService, BandFilterParams, MergeBandsRequest, BandResponse, MergeResult};
use crate::services::album_service::AlbumResponse;
use crate::services::types::{PaginatedResponse, SimilarityParams, SimilarResult};
use crate::views::band::{BandListViewEnriched, BandDetailView};
use crate::views::album::AlbumSummary;
use crate::views::{ApiResponse, ApiError};
use crate::job_state::AppState;
use crate::models::bands::Model as Band;
use crate::utils::error::handle_internal_error;
use sea_orm::DbErr;
use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};

#[derive(Debug, Serialize, ToSchema)]
pub struct BandDiscographyResponse {
    pub albums: Vec<AlbumResponse>,
}

/// Query parameters for band detail endpoint.
#[derive(Debug, Deserialize, IntoParams, Default)]
pub struct BandDetailParams {
    /// Include albums in the response. Defaults to false.
    pub include_albums: Option<bool>,
}

/// Lightweight discography response with album summaries.
#[derive(Debug, Serialize, ToSchema)]
pub struct BandDiscographySummaryResponse {
    pub albums: Vec<AlbumSummary>,
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(get_bands))
        .route("/list", get(get_bands_list))
        .route("/", post(create_band))
        .route("/similar", get(get_similar_bands))
        .route("/merge", post(merge_bands))
        .route("/{id}", get(get_band))
        .route("/{id}/detail", get(get_band_detail))
        .route("/{id}", put(update_band))
        .route("/{id}/discography", get(get_band_discography))
        .route("/{id}/discography/summary", get(get_band_discography_summary))
}

/// List bands with full response (backward compatible).
///
/// Returns full BandResponse with all relations. For better performance
/// on list/table views, consider using `/bands/list` instead.
#[utoipa::path(
    get,
    path = "/bands",
    params(
        BandFilterParams
    ),
    responses(
        (status = 200, description = "List all bands", body = PaginatedResponse<BandResponse>),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn get_bands(
    State(state): State<AppState>,
    Query(params): Query<BandFilterParams>,
) -> impl IntoResponse {
    match BandService::get_bands(&state.db, params).await {
        Ok(paginated) => (StatusCode::OK, Json(paginated)).into_response(),
        Err(e) => handle_internal_error(e),
    }
}

/// List bands with optimized lightweight response.
///
/// Returns BandListViewEnriched with only essential fields (~10 columns instead of 40+).
/// Use this endpoint for list/table displays for better performance.
#[utoipa::path(
    get,
    path = "/bands/list",
    params(
        BandFilterParams
    ),
    responses(
        (status = 200, description = "List bands with lightweight response", body = PaginatedResponse<BandListViewEnriched>),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn get_bands_list(
    State(state): State<AppState>,
    Query(params): Query<BandFilterParams>,
) -> impl IntoResponse {
    match BandService::get_bands_list(&state.db, params).await {
        Ok(paginated) => ApiResponse::ok(paginated).into_response(),
        Err(e) => handle_internal_error(e),
    }
}

#[utoipa::path(
    post,
    path = "/bands",
    request_body = Band,
    responses(
        (status = 201, description = "Band created", body = Band),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn create_band(State(state): State<AppState>, Json(data): Json<Band>) -> impl IntoResponse {
    match BandService::create_band(&state.db, data).await {
        Ok(band) => (StatusCode::CREATED, Json(band)).into_response(),
        Err(e) => handle_internal_error(e),
    }
}

#[utoipa::path(
    get,
    path = "/bands/similar",
    params(
        SimilarityParams
    ),
    responses(
        (status = 200, description = "List similar bands with full relations", body = [SimilarResult<BandResponse>]),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn get_similar_bands(
    State(state): State<AppState>,
    Query(params): Query<SimilarityParams>,
) -> impl IntoResponse {
    match BandService::get_similar_bands(&state.db, params).await {
        Ok(bands) => (StatusCode::OK, Json(bands)).into_response(),
        Err(e) => handle_internal_error(e),
    }
}

#[utoipa::path(
    post,
    path = "/bands/merge",
    request_body = MergeBandsRequest,
    responses(
        (status = 200, description = "Bands merged", body = MergeResult),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn merge_bands(State(state): State<AppState>, Json(req): Json<MergeBandsRequest>) -> impl IntoResponse {
    // TODO: Extract user_id and ip_address from auth context when auth is implemented
    let user_id: Option<u32> = None;
    let ip_address: Option<String> = None;

    match BandService::merge_bands(&state.db, req, user_id, ip_address).await {
        Ok(result) => (StatusCode::OK, Json(result)).into_response(),
        Err(e) => handle_internal_error(e),
    }
}

/// Get band by ID (backward compatible).
///
/// Returns full BandResponse with discography loaded.
/// For new integrations, consider using `/bands/{id}/detail` instead.
#[utoipa::path(
    get,
    path = "/bands/{id}",
    params(
        ("id" = i32, Path, description = "Band database id")
    ),
    responses(
        (status = 200, description = "Band found", body = BandResponse),
        (status = 404, description = "Band not found"),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn get_band(State(state): State<AppState>, Path(id): Path<u32>) -> impl IntoResponse {
    match BandService::get_band_by_id(&state.db, id).await {
        Ok(Some(band)) => (StatusCode::OK, Json(band)).into_response(),
        Ok(None) => (StatusCode::NOT_FOUND, "Band not found").into_response(),
        Err(e) => handle_internal_error(e),
    }
}

/// Get band detail with optional album loading.
///
/// Returns BandDetailView. Albums are not loaded by default - pass `include_albums=true`
/// to include discography. This prevents the double-fetch issue where the frontend
/// calls this endpoint and then `/discography` separately.
#[utoipa::path(
    get,
    path = "/bands/{id}/detail",
    params(
        ("id" = i32, Path, description = "Band database id"),
        BandDetailParams
    ),
    responses(
        (status = 200, description = "Band found", body = BandDetailView),
        (status = 404, description = "Band not found"),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn get_band_detail(
    State(state): State<AppState>,
    Path(id): Path<u32>,
    Query(params): Query<BandDetailParams>,
) -> impl IntoResponse {
    let include_albums = params.include_albums.unwrap_or(false);

    match BandService::get_band_by_id_detailed(&state.db, id, include_albums).await {
        Ok(Some(band)) => ApiResponse::ok(band).into_response(),
        Ok(None) => ApiError::not_found("Band").into_response(),
        Err(e) => handle_internal_error(e),
    }
}

#[utoipa::path(
    put,
    path = "/bands/{id}",
    params(
        ("id" = i32, Path, description = "Band database id")
    ),
    request_body = Band,
    responses(
        (status = 200, description = "Band updated", body = Band),
        (status = 404, description = "Band not found"),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn update_band(
    State(state): State<AppState>,
    Path(id): Path<u32>,
    Json(data): Json<Band>,
) -> impl IntoResponse {
    match BandService::update_band(&state.db, id, data).await {
        Ok(band) => (StatusCode::OK, Json(band)).into_response(),
        Err(DbErr::RecordNotFound(msg)) => (StatusCode::NOT_FOUND, msg).into_response(),
        Err(e) => handle_internal_error(e),
    }
}

/// Get band discography (full album data).
///
/// Returns full AlbumResponse with all relations.
#[utoipa::path(
    get,
    path = "/bands/{id}/discography",
    params(
        ("id" = i32, Path, description = "Band database id")
    ),
    responses(
        (status = 200, description = "Band discography found", body = BandDiscographyResponse),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn get_band_discography(State(state): State<AppState>, Path(id): Path<u32>) -> impl IntoResponse {
    match BandService::get_band_discography(&state.db, id).await {
        Ok(albums) => (StatusCode::OK, Json(BandDiscographyResponse { albums })).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

/// Get band discography as summaries (lightweight).
///
/// Returns album summaries with essential fields only. Use this for
/// displaying discography in band detail views where full album data
/// is not needed.
#[utoipa::path(
    get,
    path = "/bands/{id}/discography/summary",
    params(
        ("id" = i32, Path, description = "Band database id")
    ),
    responses(
        (status = 200, description = "Band discography summaries", body = BandDiscographySummaryResponse),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn get_band_discography_summary(
    State(state): State<AppState>,
    Path(id): Path<u32>,
) -> impl IntoResponse {
    match BandService::get_band_discography_summary(&state.db, id).await {
        Ok(albums) => ApiResponse::ok(BandDiscographySummaryResponse { albums }).into_response(),
        Err(e) => handle_internal_error(e),
    }
}
