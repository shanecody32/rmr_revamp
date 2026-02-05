use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post, put, delete},
    Json, Router,
};
use crate::services::{AlbumService, AlbumFilterParams, UpdateAlbumRequest, GenreUpdateResult, MergeAlbumsRequest};
use crate::services::types::{PaginatedResponse, SimilarityParams, SimilarResult};
use crate::views::ApiError;
use crate::job_state::AppState;
use crate::models::albums::Model as Album;
use sea_orm::ActiveModelTrait;
use serde::Deserialize;
use utoipa::ToSchema;

/// Request payload for creating an album
#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateAlbumRequest {
    #[serde(flatten)]
    pub album: Album,
    /// Optional band ID to associate the album with
    pub band_id: Option<u32>,
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(get_albums))
        .route("/", post(create_album))
        .route("/update-genres", post(update_all_albums_genres))
        .route("/similar", get(get_similar_albums))
        .route("/merge", post(merge_albums))
        .route("/{id}", get(get_album))
        .route("/{id}", put(update_album))
        .route("/{id}", delete(delete_album))
        .route("/{id}/songs", get(get_album_songs))
        .route("/{id}/update-genres", post(update_album_genre))
}

#[utoipa::path(
    get,
    path = "/albums/similar",
    params(
        SimilarityParams
    ),
    responses(
        (status = 200, description = "List similar albums", body = [SimilarResult<Album>]),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn get_similar_albums(
    State(state): State<AppState>,
    Query(params): Query<SimilarityParams>,
) -> impl IntoResponse {
    match AlbumService::get_similar_albums(&state.db, params).await {
        Ok(albums) => (StatusCode::OK, Json(albums)).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

#[utoipa::path(
    get,
    path = "/albums",
    params(
        AlbumFilterParams
    ),
    responses(
        (status = 200, description = "List all albums", body = PaginatedResponse<Album>),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn get_albums(
    State(state): State<AppState>,
    Query(params): Query<AlbumFilterParams>,
) -> impl IntoResponse {
    match AlbumService::get_albums(&state.db, params).await {
        Ok(paginated) => (StatusCode::OK, Json(paginated)).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

#[utoipa::path(
    post,
    path = "/albums",
    request_body = CreateAlbumRequest,
    responses(
        (status = 201, description = "Album created", body = Album),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn create_album(State(state): State<AppState>, Json(data): Json<CreateAlbumRequest>) -> impl IntoResponse {
    let band_id = data.band_id;

    match AlbumService::create_album(&state.db, data.album, band_id).await {
        Ok(album) => {
            // If band_id was provided, also create the albums_bands junction entry
            if let Some(band_id) = band_id {
                let _ = crate::models::albums_bands::ActiveModel {
                    album_id: sea_orm::ActiveValue::Set(Some(album.id)),
                    band_id: sea_orm::ActiveValue::Set(Some(band_id)),
                    ..Default::default()
                }
                .insert(&state.db)
                .await;
            }
            (StatusCode::CREATED, Json(album)).into_response()
        }
        Err(e) => ApiError::from(e).into_response(),
    }
}

#[utoipa::path(
    get,
    path = "/albums/{id}",
    params(
        ("id" = i32, Path, description = "Album database id")
    ),
    responses(
        (status = 200, description = "Album found", body = Album),
        (status = 404, description = "Album not found"),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn get_album(State(state): State<AppState>, Path(id): Path<u32>) -> impl IntoResponse {
    match AlbumService::get_album_by_id(&state.db, id).await {
        Ok(Some(album)) => (StatusCode::OK, Json(album)).into_response(),
        Ok(None) => ApiError::not_found("Album").into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

#[utoipa::path(
    put,
    path = "/albums/{id}",
    params(
        ("id" = i32, Path, description = "Album database id")
    ),
    request_body = UpdateAlbumRequest,
    responses(
        (status = 200, description = "Album updated", body = Album),
        (status = 404, description = "Album not found"),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn update_album(
    State(state): State<AppState>,
    Path(id): Path<u32>,
    Json(data): Json<UpdateAlbumRequest>,
) -> impl IntoResponse {
    match AlbumService::update_album_full(&state.db, id, data).await {
        Ok(album) => (StatusCode::OK, Json(album)).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

#[utoipa::path(
    delete,
    path = "/albums/{id}",
    params(
        ("id" = i32, Path, description = "Album database id")
    ),
    responses(
        (status = 204, description = "Album deleted"),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn delete_album(State(state): State<AppState>, Path(id): Path<u32>) -> impl IntoResponse {
    match AlbumService::delete_album(&state.db, id).await {
        Ok(_) => StatusCode::NO_CONTENT.into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

#[utoipa::path(
    get,
    path = "/albums/{id}/songs",
    params(
        ("id" = i32, Path, description = "Album database id")
    ),
    responses(
        (status = 200, description = "Album songs found", body = [crate::models::songs::Model]),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn get_album_songs(State(state): State<AppState>, Path(id): Path<u32>) -> impl IntoResponse {
    match AlbumService::get_album_songs(&state.db, id).await {
        Ok(songs) => (StatusCode::OK, Json(songs)).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

#[utoipa::path(
    post,
    path = "/albums/{id}/update-genres",
    params(
        ("id" = i32, Path, description = "Album database id")
    ),
    responses(
        (status = 200, description = "Genre updated", body = GenreUpdateResult),
        (status = 404, description = "Album not found"),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn update_album_genre(
    State(state): State<AppState>,
    Path(id): Path<u32>,
) -> impl IntoResponse {
    match AlbumService::determine_sub_genre_for_charting(&state.db, id).await {
        Ok(result) => (StatusCode::OK, Json(result)).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

#[utoipa::path(
    post,
    path = "/albums/update-genres",
    responses(
        (status = 200, description = "All album genres updated", body = [(i32, GenreUpdateResult)]),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn update_all_albums_genres(
    State(state): State<AppState>,
) -> impl IntoResponse {
    match AlbumService::update_all_albums_genres(&state.db).await {
        Ok(results) => (StatusCode::OK, Json(results)).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

pub(crate) async fn merge_albums(State(state): State<AppState>, Json(req): Json<MergeAlbumsRequest>) -> impl IntoResponse {
    // TODO: Extract user_id and ip_address from auth context when auth is implemented
    let user_id: Option<u32> = None;
    let ip_address: Option<String> = None;

    match AlbumService::merge_albums(&state.db, req, user_id, ip_address).await {
        Ok(result) => (StatusCode::OK, Json(result)).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}
