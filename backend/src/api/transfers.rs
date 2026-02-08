//! Transfer API endpoints for moving songs between albums/bands and albums between bands.

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use crate::views::ApiError;
use crate::job_state::AppState;
use crate::services::transfer_service::{
    TransferService, TransferResult, TransferPreview,
};
use serde::Deserialize;

pub fn router() -> Router<AppState> {
    Router::new()
        // Song transfers
        .route("/songs/{id}/transfer-album/preview", get(preview_song_transfer_album))
        .route("/songs/{id}/transfer-album", post(transfer_song_to_album))
        .route("/songs/{id}/transfer-band/preview", get(preview_song_transfer_band))
        .route("/songs/{id}/transfer-band", post(transfer_song_to_band))
        .route("/songs/{id}/remove-from-album", post(remove_song_from_album))
        // Album transfers
        .route("/albums/{id}/transfer-band/preview", get(preview_album_transfer_band))
        .route("/albums/{id}/transfer-band", post(transfer_album_to_band))
}

// ========== Request/Response Types ==========

#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct TransferToAlbumRequest {
    pub target_album_id: u32,
}

#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct TransferToBandRequest {
    pub target_band_id: u32,
}

#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct AlbumTransferToBandRequest {
    pub target_band_id: u32,
    #[serde(default = "default_true")]
    pub transfer_songs: bool,
}

fn default_true() -> bool {
    true
}

#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct RemoveFromAlbumRequest {
    pub album_id: u32,
}

#[derive(Debug, Deserialize)]
pub struct PreviewAlbumTransferQuery {
    pub target_band_id: u32,
    #[serde(default = "default_true")]
    pub transfer_songs: bool,
}

#[derive(Debug, Deserialize)]
pub struct PreviewTargetQuery {
    pub target_album_id: Option<u32>,
    pub target_band_id: Option<u32>,
}

// ========== Song Transfer Endpoints ==========

#[utoipa::path(
    get,
    path = "/transfers/songs/{id}/transfer-album/preview",
    params(
        ("id" = u32, Path, description = "Song ID"),
        ("target_album_id" = u32, Query, description = "Target album ID")
    ),
    responses(
        (status = 200, description = "Transfer preview", body = TransferPreview),
        (status = 400, description = "Missing target_album_id"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn preview_song_transfer_album(
    State(state): State<AppState>,
    Path(song_id): Path<u32>,
    Query(query): Query<PreviewTargetQuery>,
) -> impl IntoResponse {
    let target_album_id = match query.target_album_id {
        Some(id) => id,
        None => return (StatusCode::BAD_REQUEST, "target_album_id is required").into_response(),
    };

    match TransferService::preview_song_transfer_album(&state.db, song_id, target_album_id).await {
        Ok(preview) => (StatusCode::OK, Json(preview)).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

#[utoipa::path(
    post,
    path = "/transfers/songs/{id}/transfer-album",
    params(
        ("id" = u32, Path, description = "Song ID")
    ),
    request_body = TransferToAlbumRequest,
    responses(
        (status = 200, description = "Song transferred", body = TransferResult),
        (status = 404, description = "Song or album not found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn transfer_song_to_album(
    State(state): State<AppState>,
    Path(song_id): Path<u32>,
    Json(request): Json<TransferToAlbumRequest>,
) -> impl IntoResponse {
    // TODO: Get user_id from auth context
    let user_id: Option<u32> = None;
    let ip_address: Option<String> = None;

    match TransferService::transfer_song_to_album(
        &state.db,
        song_id,
        request.target_album_id,
        user_id,
        ip_address,
    ).await {
        Ok(result) => (StatusCode::OK, Json(result)).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

#[utoipa::path(
    get,
    path = "/transfers/songs/{id}/transfer-band/preview",
    params(
        ("id" = u32, Path, description = "Song ID"),
        ("target_band_id" = u32, Query, description = "Target band ID")
    ),
    responses(
        (status = 200, description = "Transfer preview", body = TransferPreview),
        (status = 400, description = "Missing target_band_id"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn preview_song_transfer_band(
    State(state): State<AppState>,
    Path(song_id): Path<u32>,
    Query(query): Query<PreviewTargetQuery>,
) -> impl IntoResponse {
    let target_band_id = match query.target_band_id {
        Some(id) => id,
        None => return (StatusCode::BAD_REQUEST, "target_band_id is required").into_response(),
    };

    match TransferService::preview_song_transfer_band(&state.db, song_id, target_band_id).await {
        Ok(preview) => (StatusCode::OK, Json(preview)).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

#[utoipa::path(
    post,
    path = "/transfers/songs/{id}/transfer-band",
    params(
        ("id" = u32, Path, description = "Song ID")
    ),
    request_body = TransferToBandRequest,
    responses(
        (status = 200, description = "Song transferred", body = TransferResult),
        (status = 404, description = "Song or band not found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn transfer_song_to_band(
    State(state): State<AppState>,
    Path(song_id): Path<u32>,
    Json(request): Json<TransferToBandRequest>,
) -> impl IntoResponse {
    let user_id: Option<u32> = None;
    let ip_address: Option<String> = None;

    match TransferService::transfer_song_to_band(
        &state.db,
        song_id,
        request.target_band_id,
        user_id,
        ip_address,
    ).await {
        Ok(result) => (StatusCode::OK, Json(result)).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

#[utoipa::path(
    post,
    path = "/transfers/songs/{id}/remove-from-album",
    params(
        ("id" = u32, Path, description = "Song ID")
    ),
    request_body = RemoveFromAlbumRequest,
    responses(
        (status = 200, description = "Song removed from album", body = TransferResult),
        (status = 404, description = "Song not on album"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn remove_song_from_album(
    State(state): State<AppState>,
    Path(song_id): Path<u32>,
    Json(request): Json<RemoveFromAlbumRequest>,
) -> impl IntoResponse {
    let user_id: Option<u32> = None;
    let ip_address: Option<String> = None;

    match TransferService::remove_song_from_album(
        &state.db,
        song_id,
        request.album_id,
        user_id,
        ip_address,
    ).await {
        Ok(result) => (StatusCode::OK, Json(result)).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

// ========== Album Transfer Endpoints ==========

#[utoipa::path(
    get,
    path = "/transfers/albums/{id}/transfer-band/preview",
    params(
        ("id" = u32, Path, description = "Album ID"),
        ("target_band_id" = u32, Query, description = "Target band ID"),
        ("transfer_songs" = bool, Query, description = "Also transfer songs")
    ),
    responses(
        (status = 200, description = "Transfer preview", body = TransferPreview),
        (status = 400, description = "Missing target_band_id"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn preview_album_transfer_band(
    State(state): State<AppState>,
    Path(album_id): Path<u32>,
    Query(query): Query<PreviewAlbumTransferQuery>,
) -> impl IntoResponse {
    match TransferService::preview_album_transfer_band(
        &state.db,
        album_id,
        query.target_band_id,
        query.transfer_songs,
    ).await {
        Ok(preview) => (StatusCode::OK, Json(preview)).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

#[utoipa::path(
    post,
    path = "/transfers/albums/{id}/transfer-band",
    params(
        ("id" = u32, Path, description = "Album ID")
    ),
    request_body = AlbumTransferToBandRequest,
    responses(
        (status = 200, description = "Album transferred", body = TransferResult),
        (status = 404, description = "Album or band not found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn transfer_album_to_band(
    State(state): State<AppState>,
    Path(album_id): Path<u32>,
    Json(request): Json<AlbumTransferToBandRequest>,
) -> impl IntoResponse {
    let user_id: Option<u32> = None;
    let ip_address: Option<String> = None;

    match TransferService::transfer_album_to_band(
        &state.db,
        album_id,
        request.target_band_id,
        request.transfer_songs,
        user_id,
        ip_address,
    ).await {
        Ok(result) => (StatusCode::OK, Json(result)).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}
