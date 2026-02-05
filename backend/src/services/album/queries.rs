//! Album list and query functions.

use crate::models::albums::Entity as Album;
use crate::services::types::{PaginatedResponse, PaginationInfo};
use super::types::{AlbumResponse, AlbumFilterParams};
use super::relations::load_album_relations;
use sea_orm::*;

/// Get paginated list of albums with full relations.
pub async fn get_albums(
    db: &DatabaseConnection,
    params: AlbumFilterParams,
) -> Result<PaginatedResponse<AlbumResponse>, DbErr> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);

    let mut query = Album::find();

    if let Some(name) = params.name
        && !name.is_empty() {
            match params.name_filter_type.as_deref() {
                Some("starts_with") => {
                    query = query.filter(crate::models::albums::Column::Name.starts_with(&name));
                }
                Some("ends_with") => {
                    query = query.filter(crate::models::albums::Column::Name.ends_with(&name));
                }
                Some("exact_match") => {
                    query = query.filter(crate::models::albums::Column::Name.eq(&name));
                }
                _ => {
                    query = query.filter(crate::models::albums::Column::Name.contains(&name));
                }
            }
        }

    if let Some(verified) = params.verified {
        query = query.filter(crate::models::albums::Column::Verified.eq(if verified { 1 } else { 0 }));
    }
    if let Some(approved) = params.approved {
        query = query.filter(crate::models::albums::Column::Approved.eq(if approved { 1 } else { 0 }));
    }

    let paginator = query.paginate(db, page_size);
    let total_items = paginator.num_items().await?;
    let total_pages = paginator.num_pages().await?;

    let album_models = paginator.fetch_page(page - 1).await?;
    let results = load_album_relations(db, album_models).await?;

    Ok(PaginatedResponse {
        results,
        pagination: PaginationInfo {
            page,
            page_size,
            total_pages,
            total_items,
        },
    })
}

/// Get album by ID with full relations.
pub async fn get_album_by_id(db: &DatabaseConnection, id: u32) -> Result<Option<AlbumResponse>, DbErr> {
    let album = Album::find_by_id(id).one(db).await?;
    if let Some(album) = album {
        let relations = load_album_relations(db, vec![album]).await?;
        Ok(relations.into_iter().next())
    } else {
        Ok(None)
    }
}
