use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{delete, get, post, put},
    Json, Router,
};
use sea_orm::DbErr;
use crate::services::staff_playlist_service::{
    StaffPlaylistService, PlaylistFilterParams, ArchiveFilterParams,
    CreatePlaylistEntryRequest, UpdateSpinsRequest, BulkUpdateSpinsRequest,
    AddSpinsRequest, CheckDuplicateParams,
    DuplicateWarningParams, ImportFromArchiveRequest,
};
use crate::views::ApiError;
use crate::job_state::AppState;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(get_playlist_entries))
        .route("/", post(create_entry))
        .route("/check-duplicate", get(check_duplicate))
        .route("/duplicate-warnings", get(get_duplicate_warnings))
        .route("/bulk-update-spins", post(bulk_update_spins))
        .route("/import-from-archive", post(import_from_archive))
        .route("/archive-weeks/{staff_member_id}", get(get_archive_weeks))
        .route("/archives", get(get_archive_entries))
        .route("/finalise/{staff_member_id}", post(finalise_playlist))
        .route("/unlock/{staff_member_id}", post(unlock_playlist))
        .route("/all/{staff_member_id}", delete(delete_all_entries))
        .route("/{id}/spins", put(update_spins))
        .route("/{id}/add-spins", post(add_spins_to_existing))
        .route("/{id}", delete(delete_entries_by_id))
}

pub(crate) async fn get_playlist_entries(
    State(state): State<AppState>,
    Query(params): Query<PlaylistFilterParams>,
) -> impl IntoResponse {
    match StaffPlaylistService::get_playlist_entries(&state.db, params).await {
        Ok(paginated) => (StatusCode::OK, Json(paginated)).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

pub(crate) async fn create_entry(
    State(state): State<AppState>,
    Json(data): Json<CreatePlaylistEntryRequest>,
) -> impl IntoResponse {
    match StaffPlaylistService::create_entry(&state.db, data).await {
        Ok(entry) => (StatusCode::CREATED, Json(entry)).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

pub(crate) async fn update_spins(
    State(state): State<AppState>,
    Path(id): Path<u32>,
    Json(data): Json<UpdateSpinsRequest>,
) -> impl IntoResponse {
    match StaffPlaylistService::update_spins(&state.db, id, data.spins).await {
        Ok(entry) => (StatusCode::OK, Json(entry)).into_response(),
        Err(DbErr::RecordNotFound(msg)) => (StatusCode::NOT_FOUND, msg).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

pub(crate) async fn bulk_update_spins(
    State(state): State<AppState>,
    Json(data): Json<BulkUpdateSpinsRequest>,
) -> impl IntoResponse {
    match StaffPlaylistService::bulk_update_spins(&state.db, data.updates).await {
        Ok(count) => (StatusCode::OK, Json(serde_json::json!({ "updated": count }))).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

pub(crate) async fn delete_entries_by_id(
    State(state): State<AppState>,
    Path(id): Path<u32>,
) -> impl IntoResponse {
    match StaffPlaylistService::delete_entries(&state.db, vec![id]).await {
        Ok(count) => (StatusCode::OK, Json(serde_json::json!({ "deleted": count }))).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

pub(crate) async fn delete_all_entries(
    State(state): State<AppState>,
    Path(staff_member_id): Path<u32>,
) -> impl IntoResponse {
    match StaffPlaylistService::delete_all_entries(&state.db, staff_member_id).await {
        Ok(count) => (StatusCode::OK, Json(serde_json::json!({ "deleted": count }))).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

pub(crate) async fn check_duplicate(
    State(state): State<AppState>,
    Query(params): Query<CheckDuplicateParams>,
) -> impl IntoResponse {
    match StaffPlaylistService::check_duplicate(&state.db, params).await {
        Ok(Some(entry)) => (StatusCode::OK, Json(serde_json::json!({ "duplicate": true, "entry": entry }))).into_response(),
        Ok(None) => (StatusCode::OK, Json(serde_json::json!({ "duplicate": false }))).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

pub(crate) async fn get_duplicate_warnings(
    State(state): State<AppState>,
    Query(params): Query<DuplicateWarningParams>,
) -> impl IntoResponse {
    match StaffPlaylistService::get_entity_duplicate_warnings(&state.db, params).await {
        Ok(warnings) => (StatusCode::OK, Json(warnings)).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

pub(crate) async fn add_spins_to_existing(
    State(state): State<AppState>,
    Path(id): Path<u32>,
    Json(data): Json<AddSpinsRequest>,
) -> impl IntoResponse {
    match StaffPlaylistService::add_spins_to_existing(&state.db, id, data.additional_spins).await {
        Ok(entry) => (StatusCode::OK, Json(entry)).into_response(),
        Err(DbErr::RecordNotFound(msg)) => (StatusCode::NOT_FOUND, msg).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

pub(crate) async fn import_from_archive(
    State(state): State<AppState>,
    Json(data): Json<ImportFromArchiveRequest>,
) -> impl IntoResponse {
    match StaffPlaylistService::import_from_archive(&state.db, data).await {
        Ok(result) => (StatusCode::OK, Json(result)).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

pub(crate) async fn get_archive_weeks(
    State(state): State<AppState>,
    Path(staff_member_id): Path<u32>,
) -> impl IntoResponse {
    match StaffPlaylistService::get_archive_weeks(&state.db, staff_member_id).await {
        Ok(weeks) => (StatusCode::OK, Json(weeks)).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

pub(crate) async fn get_archive_entries(
    State(state): State<AppState>,
    Query(params): Query<ArchiveFilterParams>,
) -> impl IntoResponse {
    match StaffPlaylistService::get_archive_entries(&state.db, params).await {
        Ok(paginated) => (StatusCode::OK, Json(paginated)).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

pub(crate) async fn finalise_playlist(
    State(state): State<AppState>,
    Path(staff_member_id): Path<u32>,
) -> impl IntoResponse {
    match StaffPlaylistService::finalise_playlist(&state.db, staff_member_id).await {
        Ok(()) => (StatusCode::OK, Json(serde_json::json!({ "success": true }))).into_response(),
        Err(DbErr::RecordNotFound(msg)) => (StatusCode::NOT_FOUND, msg).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

pub(crate) async fn unlock_playlist(
    State(state): State<AppState>,
    Path(staff_member_id): Path<u32>,
) -> impl IntoResponse {
    match StaffPlaylistService::unlock_playlist(&state.db, staff_member_id).await {
        Ok(()) => (StatusCode::OK, Json(serde_json::json!({ "success": true }))).into_response(),
        Err(DbErr::RecordNotFound(msg)) => (StatusCode::NOT_FOUND, msg).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}
