use crate::models::genres::{Entity as Genre, Model as GenreModel, Column as GenreColumn};
use crate::models::sub_genres::{Entity as SubGenre, Model as SubGenreModel, Column as SubGenreColumn};
use crate::services::types::{PaginatedResponse, PaginationInfo};
use sea_orm::*;

pub struct GenreService;

impl GenreService {
    pub async fn get_genres(
        db: &DatabaseConnection,
        name: Option<String>,
        name_filter_type: Option<String>,
        page: u64,
        page_size: u64,
    ) -> Result<PaginatedResponse<GenreModel>, DbErr> {
        let mut query = Genre::find();

        if let Some(name) = name
            && !name.is_empty()
        {
            match name_filter_type.as_deref() {
                Some("starts_with") => query = query.filter(GenreColumn::Name.starts_with(&name)),
                Some("ends_with") => query = query.filter(GenreColumn::Name.ends_with(&name)),
                Some("exact_match") => query = query.filter(GenreColumn::Name.eq(&name)),
                _ => query = query.filter(GenreColumn::Name.contains(&name)),
            }
        }

        let paginator = query.paginate(db, page_size);
        let total_items = paginator.num_items().await?;
        let total_pages = paginator.num_pages().await?;
        let results = paginator.fetch_page(page - 1).await?;

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

    pub async fn get_sub_genres(
        db: &DatabaseConnection,
        genre_id: Option<u32>,
        name: Option<String>,
        name_filter_type: Option<String>,
        page: u64,
        page_size: u64,
    ) -> Result<PaginatedResponse<SubGenreModel>, DbErr> {
        let mut query = SubGenre::find();

        if let Some(gid) = genre_id {
            query = query.filter(SubGenreColumn::GenreId.eq(gid));
        }

        if let Some(name) = name
            && !name.is_empty()
        {
            match name_filter_type.as_deref() {
                Some("starts_with") => query = query.filter(SubGenreColumn::Name.starts_with(&name)),
                Some("ends_with") => query = query.filter(SubGenreColumn::Name.ends_with(&name)),
                Some("exact_match") => query = query.filter(SubGenreColumn::Name.eq(&name)),
                _ => query = query.filter(SubGenreColumn::Name.contains(&name)),
            }
        }

        let paginator = query.paginate(db, page_size);
        let total_items = paginator.num_items().await?;
        let total_pages = paginator.num_pages().await?;
        let results = paginator.fetch_page(page - 1).await?;

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

    pub async fn get_sub_genres_by_genre(db: &DatabaseConnection, genre_id: u32) -> Result<Vec<SubGenreModel>, DbErr> {
        SubGenre::find()
            .filter(SubGenreColumn::GenreId.eq(genre_id))
            .all(db)
            .await
    }
}
