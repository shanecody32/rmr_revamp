use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post, put, delete},
    Json, Router,
};
use crate::services::song_service::{SongService, SongFilterParams, MergeSongsRequest};
use crate::services::types::{PaginatedResponse, SimilarityParams, SimilarResult};
use crate::views::ApiError;
use crate::job_state::AppState;
use crate::models::songs::Model as Song;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(get_songs))
        .route("/", post(create_song))
        .route("/similar", get(get_similar_songs))
        .route("/merge", post(merge_songs))
        .route("/{id}", get(get_song))
        .route("/{id}", put(update_song))
        .route("/{id}", delete(delete_song))
}

#[utoipa::path(
    get,
    path = "/songs/similar",
    params(
        SimilarityParams
    ),
    responses(
        (status = 200, description = "List similar songs", body = [SimilarResult<Song>]),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn get_similar_songs(
    State(state): State<AppState>,
    Query(params): Query<SimilarityParams>,
) -> impl IntoResponse {
    match SongService::get_similar_songs(&state.db, params).await {
        Ok(songs) => (StatusCode::OK, Json(songs)).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

#[utoipa::path(
    get,
    path = "/songs",
    params(
        SongFilterParams
    ),
    responses(
        (status = 200, description = "List all songs", body = PaginatedResponse<Song>),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn get_songs(
    State(state): State<AppState>,
    Query(params): Query<SongFilterParams>,
) -> impl IntoResponse {
    match SongService::get_songs(&state.db, params).await {
        Ok(paginated) => (StatusCode::OK, Json(paginated)).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

#[utoipa::path(
    post,
    path = "/songs",
    request_body = Song,
    responses(
        (status = 201, description = "Song created", body = Song),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn create_song(State(state): State<AppState>, Json(data): Json<Song>) -> impl IntoResponse {
    match SongService::create_song(&state.db, data).await {
        Ok(song) => (StatusCode::CREATED, Json(song)).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

#[utoipa::path(
    get,
    path = "/songs/{id}",
    params(
        ("id" = i32, Path, description = "Song database id")
    ),
    responses(
        (status = 200, description = "Song found", body = Song),
        (status = 404, description = "Song not found"),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn get_song(State(state): State<AppState>, Path(id): Path<u32>) -> impl IntoResponse {
    match SongService::get_song_by_id(&state.db, id).await {
        Ok(Some(song)) => (StatusCode::OK, Json(song)).into_response(),
        Ok(None) => ApiError::not_found("Song").into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

#[utoipa::path(
    put,
    path = "/songs/{id}",
    params(
        ("id" = i32, Path, description = "Song database id")
    ),
    request_body = Song,
    responses(
        (status = 200, description = "Song updated", body = Song),
        (status = 404, description = "Song not found"),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn update_song(
    State(state): State<AppState>,
    Path(id): Path<u32>,
    Json(data): Json<Song>,
) -> impl IntoResponse {
    match SongService::update_song(&state.db, id, data).await {
        Ok(song) => (StatusCode::OK, Json(song)).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

#[utoipa::path(
    delete,
    path = "/songs/{id}",
    params(
        ("id" = i32, Path, description = "Song database id")
    ),
    responses(
        (status = 204, description = "Song deleted"),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn delete_song(State(state): State<AppState>, Path(id): Path<u32>) -> impl IntoResponse {
    match SongService::delete_song(&state.db, id).await {
        Ok(_) => StatusCode::NO_CONTENT.into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

pub(crate) async fn merge_songs(State(state): State<AppState>, Json(req): Json<MergeSongsRequest>) -> impl IntoResponse {
    // TODO: Extract user_id and ip_address from auth context when auth is implemented
    let user_id: Option<u32> = None;
    let ip_address: Option<String> = None;

    match SongService::merge_songs(&state.db, req, user_id, ip_address).await {
        Ok(result) => (StatusCode::OK, Json(result)).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}
