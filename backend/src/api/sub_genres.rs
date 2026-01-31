use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use crate::services::genre_service::GenreService;
use crate::services::types::{PaginatedResponse, PaginationInfo};
use crate::job_state::AppState;
use crate::models::sub_genres::Model as SubGenre;
use serde::Deserialize;
use utoipa::IntoParams;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(get_sub_genres))
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct SubGenreFilterParams {
    pub name: Option<String>,
    pub name_filter_type: Option<String>,
    pub genre_id: Option<u32>,
    pub page: Option<u64>,
    pub page_size: Option<u64>,
}

#[utoipa::path(
    get,
    path = "/sub_genres",
    params(
        SubGenreFilterParams
    ),
    responses(
        (status = 200, description = "List all subgenres", body = PaginatedResponse<SubGenre>),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn get_sub_genres(
    State(state): State<AppState>,
    Query(params): Query<SubGenreFilterParams>,
) -> impl IntoResponse {
    let result = if let Some(genre_id) = params.genre_id {
        GenreService::get_sub_genres_by_genre(&state.db, genre_id).await
    } else {
        GenreService::get_sub_genres(&state.db).await
    };

    match result {
        Ok(sub_genres) => {
            let filtered: Vec<_> = sub_genres.into_iter().filter(|g| {
                if let Some(name) = &params.name {
                    if name.is_empty() { return true; }
                    let name_low = name.to_lowercase();
                    let g_name = g.name.as_ref().map(|n| n.to_lowercase()).unwrap_or_default();
                    
                    match params.name_filter_type.as_deref() {
                        Some("starts_with") => g_name.starts_with(&name_low),
                        Some("ends_with") => g_name.ends_with(&name_low),
                        Some("exact_match") => g_name == name_low,
                        _ => g_name.contains(&name_low),
                    }
                } else {
                    true
                }
            }).collect();
            
            // Simple pagination
            let total_items = filtered.len() as u64;
            let page = params.page.unwrap_or(1);
            let page_size = params.page_size.unwrap_or(10);
            
            let results = filtered.into_iter()
                .skip(((page - 1) * page_size) as usize)
                .take(page_size as usize)
                .collect();

            (StatusCode::OK, Json(PaginatedResponse {
                results,
                pagination: PaginationInfo {
                    page,
                    page_size,
                    total_pages: (total_items + page_size - 1) / page_size,
                    total_items,
                }
            })).into_response()
        },
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}
