use crate::models::genres::{Entity as Genre, Model as GenreModel};
use crate::models::sub_genres::{Entity as SubGenre, Model as SubGenreModel};
use sea_orm::*;

pub struct GenreService;

impl GenreService {
    pub async fn get_genres(db: &DatabaseConnection) -> Result<Vec<GenreModel>, DbErr> {
        Genre::find().all(db).await
    }

    pub async fn get_sub_genres(db: &DatabaseConnection) -> Result<Vec<SubGenreModel>, DbErr> {
        SubGenre::find().all(db).await
    }

    pub async fn get_sub_genres_by_genre(db: &DatabaseConnection, genre_id: u32) -> Result<Vec<SubGenreModel>, DbErr> {
        SubGenre::find()
            .filter(crate::models::sub_genres::Column::GenreId.eq(genre_id))
            .all(db)
            .await
    }
}
