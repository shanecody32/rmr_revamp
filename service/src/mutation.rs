use ::entity::{bands as band, bands::Entity as Band};
use sea_orm::*;

pub struct Mutation;

impl Mutation {
    pub async fn create_band(
        db: &DbConn,
        form_data: band::Model,
    ) -> Result<band::ActiveModel, DbErr> {
        band::ActiveModel {
            name: Set(form_data.name.to_owned()),
            bio: Set(form_data.bio.to_owned()),
            ..Default::default()
        }
            .save(db)
            .await
    }

    pub async fn update_band_by_id(
        db: &DbConn,
        id: i32,
        form_data: band::Model,
    ) -> Result<band::Model, DbErr> {
        let band: band::ActiveModel = Band::find_by_id(id)
            .one(db)
            .await?
            .ok_or(DbErr::Custom("Cannot find band.".to_owned()))
            .map(Into::into)?;

        band::ActiveModel {
            id: band.id,
            name: Set(form_data.name.to_owned()),
            bio: Set(form_data.bio.to_owned()),
            ..Default::default()
        }
            .update(db)
            .await
    }

    pub async fn delete_band(db: &DbConn, id: i32) -> Result<DeleteResult, DbErr> {
        let band: band::ActiveModel = Band::find_by_id(id)
            .one(db)
            .await?
            .ok_or(DbErr::Custom("Cannot find band.".to_owned()))
            .map(Into::into)?;

        band.delete(db).await
    }

    pub async fn delete_all_bands(db: &DbConn) -> Result<DeleteResult, DbErr> {
        Band::delete_many().exec(db).await
    }
}