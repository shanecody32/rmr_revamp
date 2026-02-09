use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{delete, get, post, put},
    Json, Router,
};
use serde::Deserialize;
use crate::services::staff_service::{
    ArchiveStaffRequest, MergeStaffRequest, StaffDetailParams, StaffFilterParams,
    StaffMergeResult, StaffMergePreviewResponse, StaffResponse, StaffService, StaffTransferRequest, StaffTransferResult,
};
use crate::services::types::{PaginatedResponse, SimilarityParams};
use crate::services::staff_service::SimilarStaffResult;
use crate::views::staff::{StaffDetailView, StaffListViewEnriched};
use crate::views::{ApiError, ApiResponse};
use crate::job_state::AppState;
use crate::models::staff_members::Model as StaffMemberModel;
use sea_orm::DbErr;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(get_staff_members))
        .route("/list", get(get_staff_members_list))
        .route("/", post(create_staff_member))
        .route("/similar", get(get_similar_staff_members))
        .route("/merge", post(merge_staff_members))
        .route("/merge-preview", get(merge_preview))
        .route("/{id}", get(get_staff_member))
        .route("/{id}/detail", get(get_staff_member_detail))
        .route("/{id}", put(update_staff_member))
        .route("/{id}", delete(delete_staff_member))
        .route("/{id}/transfer", post(transfer_staff_member))
        .route("/{id}/archive", post(archive_staff_member))
        .route("/{id}/unarchive", post(unarchive_staff_member))
        .route("/{id}/recalculate-genres", post(recalculate_genres))
}

/// List staff members with full response (backward compatible).
///
/// Returns full StaffResponse with all relations. For better performance
/// on list/table views, consider using `/staff_members/list` instead.
#[utoipa::path(
    get,
    path = "/staff_members",
    params(StaffFilterParams),
    responses(
        (status = 200, description = "List all staff members", body = PaginatedResponse<StaffResponse>),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn get_staff_members(
    State(state): State<AppState>,
    Query(params): Query<StaffFilterParams>,
) -> impl IntoResponse {
    match StaffService::get_staff_members(&state.db, params).await {
        Ok(paginated) => (StatusCode::OK, Json(paginated)).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

/// List staff members with optimized lightweight response.
///
/// Returns StaffListViewEnriched with only essential fields (~12 columns instead of 40+).
/// Use this endpoint for list/table displays for better performance.
#[utoipa::path(
    get,
    path = "/staff_members/list",
    params(StaffFilterParams),
    responses(
        (status = 200, description = "List staff members with lightweight response", body = PaginatedResponse<StaffListViewEnriched>),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn get_staff_members_list(
    State(state): State<AppState>,
    Query(params): Query<StaffFilterParams>,
) -> impl IntoResponse {
    match StaffService::get_staff_members_list(&state.db, params).await {
        Ok(paginated) => ApiResponse::ok(paginated).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

/// Create a new staff member.
#[utoipa::path(
    post,
    path = "/staff_members",
    request_body = StaffMemberModel,
    responses(
        (status = 201, description = "Staff member created", body = StaffMemberModel),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn create_staff_member(
    State(state): State<AppState>,
    Json(data): Json<StaffMemberModel>,
) -> impl IntoResponse {
    match StaffService::create_staff_member(&state.db, data).await {
        Ok(staff) => (StatusCode::CREATED, Json(staff)).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

/// Get similar staff members for duplicate detection (station-scoped).
#[utoipa::path(
    get,
    path = "/staff_members/similar",
    params(SimilarityParams),
    responses(
        (status = 200, description = "List similar staff members", body = [SimilarStaffResult]),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn get_similar_staff_members(
    State(state): State<AppState>,
    Query(params): Query<SimilarityParams>,
) -> impl IntoResponse {
    match StaffService::get_similar_staff_members(&state.db, params).await {
        Ok(results) => (StatusCode::OK, Json(results)).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

#[derive(Debug, Deserialize)]
pub(crate) struct MergePreviewParams {
    ids: String,
}

#[utoipa::path(
    get,
    path = "/staff_members/merge-preview",
    params(
        ("ids" = String, Query, description = "Comma-separated staff member IDs")
    ),
    responses(
        (status = 200, description = "Merge preview with related data counts", body = StaffMergePreviewResponse),
        (status = 400, description = "Invalid IDs"),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn merge_preview(
    State(state): State<AppState>,
    Query(params): Query<MergePreviewParams>,
) -> impl IntoResponse {
    let ids: Result<Vec<u32>, _> = params.ids.split(',')
        .map(|s| s.trim().parse::<u32>())
        .collect();

    match ids {
        Ok(staff_ids) if !staff_ids.is_empty() => {
            match StaffService::get_staff_merge_preview(&state.db, staff_ids).await {
                Ok(preview) => (StatusCode::OK, Json(preview)).into_response(),
                Err(e) => ApiError::from(e).into_response(),
            }
        }
        _ => ApiError::validation("Invalid or empty staff member IDs".to_string(), None).into_response(),
    }
}

/// Merge multiple staff members into one (station-scoped).
///
/// All staff members must belong to the same radio station.
/// Playlists are aggregated (spins summed for exact matches).
/// Sub-genres are recalculated after merge.
#[utoipa::path(
    post,
    path = "/staff_members/merge",
    request_body = MergeStaffRequest,
    responses(
        (status = 200, description = "Staff members merged", body = StaffMergeResult),
        (status = 400, description = "Cannot merge staff from different stations"),
        (status = 404, description = "Staff member not found"),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn merge_staff_members(
    State(state): State<AppState>,
    Json(req): Json<MergeStaffRequest>,
) -> impl IntoResponse {
    // TODO: Extract user_id from auth context and ip_address from request
    match StaffService::merge_staff_members(&state.db, req, None, None).await {
        Ok(result) => (StatusCode::OK, Json(result)).into_response(),
        Err(DbErr::Custom(msg)) => {
            ApiError::validation(msg, None).into_response()
        }
        Err(DbErr::RecordNotFound(msg)) => {
            ApiError::not_found(&msg).into_response()
        }
        Err(e) => ApiError::from(e).into_response(),
    }
}

/// Get staff member by ID (backward compatible).
///
/// Returns full StaffDetailView with basic relations.
/// For new integrations, consider using `/staff_members/{id}/detail` instead.
#[utoipa::path(
    get,
    path = "/staff_members/{id}",
    params(
        ("id" = u32, Path, description = "Staff member ID")
    ),
    responses(
        (status = 200, description = "Staff member found", body = StaffDetailView),
        (status = 404, description = "Staff member not found"),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn get_staff_member(
    State(state): State<AppState>,
    Path(id): Path<u32>,
) -> impl IntoResponse {
    let params = StaffDetailParams::default();
    match StaffService::get_staff_member_by_id(&state.db, id, params).await {
        Ok(Some(staff)) => (StatusCode::OK, Json(staff)).into_response(),
        Ok(None) => ApiError::not_found("Staff member").into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

/// Get staff member detail with optional relations.
///
/// Returns StaffDetailView. Relations are loaded by default but can be disabled
/// via query parameters.
#[utoipa::path(
    get,
    path = "/staff_members/{id}/detail",
    params(
        ("id" = u32, Path, description = "Staff member ID"),
        StaffDetailParams
    ),
    responses(
        (status = 200, description = "Staff member found", body = StaffDetailView),
        (status = 404, description = "Staff member not found"),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn get_staff_member_detail(
    State(state): State<AppState>,
    Path(id): Path<u32>,
    Query(params): Query<StaffDetailParams>,
) -> impl IntoResponse {
    match StaffService::get_staff_member_by_id(&state.db, id, params).await {
        Ok(Some(staff)) => ApiResponse::ok(staff).into_response(),
        Ok(None) => ApiError::not_found("Staff member").into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

/// Update a staff member.
#[utoipa::path(
    put,
    path = "/staff_members/{id}",
    params(
        ("id" = u32, Path, description = "Staff member ID")
    ),
    request_body = StaffMemberModel,
    responses(
        (status = 200, description = "Staff member updated", body = StaffMemberModel),
        (status = 404, description = "Staff member not found"),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn update_staff_member(
    State(state): State<AppState>,
    Path(id): Path<u32>,
    Json(data): Json<StaffMemberModel>,
) -> impl IntoResponse {
    match StaffService::update_staff_member(&state.db, id, data).await {
        Ok(staff) => (StatusCode::OK, Json(staff)).into_response(),
        Err(DbErr::RecordNotFound(msg)) => ApiError::not_found(&msg).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

/// Delete a staff member.
#[utoipa::path(
    delete,
    path = "/staff_members/{id}",
    params(
        ("id" = u32, Path, description = "Staff member ID")
    ),
    responses(
        (status = 204, description = "Staff member deleted"),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn delete_staff_member(
    State(state): State<AppState>,
    Path(id): Path<u32>,
) -> impl IntoResponse {
    match StaffService::delete_staff_member(&state.db, id).await {
        Ok(()) => StatusCode::NO_CONTENT.into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

/// Transfer a staff member to a new radio station.
///
/// Creates a new profile at the target station and archives the old profile.
/// Images, links, and phone numbers are copied. Addresses and playlists stay
/// with the old profile.
#[utoipa::path(
    post,
    path = "/staff_members/{id}/transfer",
    params(
        ("id" = u32, Path, description = "Staff member ID to transfer")
    ),
    request_body = StaffTransferRequest,
    responses(
        (status = 200, description = "Staff member transferred", body = StaffTransferResult),
        (status = 404, description = "Staff member or station not found"),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn transfer_staff_member(
    State(state): State<AppState>,
    Path(_id): Path<u32>,
    Json(req): Json<StaffTransferRequest>,
) -> impl IntoResponse {
    // TODO: Extract user_id from auth context and ip_address from request
    match StaffService::transfer_to_station(&state.db, req, None, None).await {
        Ok(result) => ApiResponse::ok(result).into_response(),
        Err(DbErr::RecordNotFound(msg)) => ApiError::not_found(&msg).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

/// Archive a staff member.
#[utoipa::path(
    post,
    path = "/staff_members/{id}/archive",
    params(
        ("id" = u32, Path, description = "Staff member ID to archive")
    ),
    request_body = ArchiveStaffRequest,
    responses(
        (status = 200, description = "Staff member archived", body = StaffMemberModel),
        (status = 404, description = "Staff member not found"),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn archive_staff_member(
    State(state): State<AppState>,
    Path(id): Path<u32>,
    Json(req): Json<ArchiveStaffRequest>,
) -> impl IntoResponse {
    // TODO: Extract user_id from auth context and ip_address from request
    match StaffService::archive_staff_member(&state.db, id, &req.reason, None, None).await {
        Ok(staff) => ApiResponse::ok(staff).into_response(),
        Err(DbErr::RecordNotFound(msg)) => ApiError::not_found(&msg).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

/// Unarchive a staff member.
#[utoipa::path(
    post,
    path = "/staff_members/{id}/unarchive",
    params(
        ("id" = u32, Path, description = "Staff member ID to unarchive")
    ),
    responses(
        (status = 200, description = "Staff member unarchived", body = StaffMemberModel),
        (status = 404, description = "Staff member not found"),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn unarchive_staff_member(
    State(state): State<AppState>,
    Path(id): Path<u32>,
) -> impl IntoResponse {
    // TODO: Extract user_id from auth context and ip_address from request
    match StaffService::unarchive_staff_member(&state.db, id, None, None).await {
        Ok(staff) => ApiResponse::ok(staff).into_response(),
        Err(DbErr::RecordNotFound(msg)) => ApiError::not_found(&msg).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}

/// Recalculate sub-genres for a staff member based on playlist archives.
///
/// Uses the 5+ unique songs from 5+ unique bands threshold per sub-genre.
#[utoipa::path(
    post,
    path = "/staff_members/{id}/recalculate-genres",
    params(
        ("id" = u32, Path, description = "Staff member ID")
    ),
    responses(
        (status = 200, description = "Sub-genres recalculated", body = Vec<u32>),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn recalculate_genres(
    State(state): State<AppState>,
    Path(id): Path<u32>,
) -> impl IntoResponse {
    match StaffService::recalculate_sub_genres(&state.db, id).await {
        Ok(genre_ids) => ApiResponse::ok(genre_ids).into_response(),
        Err(e) => ApiError::from(e).into_response(),
    }
}
