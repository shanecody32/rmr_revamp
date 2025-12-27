use ::entity::{band, band::Entity as Band};
use sea_orm::*;

pub struct Query;

impl Query {
    pub async fn find_band_by_id(db: &DbConn, id: i32) -> Result<Option<band::Model>, DbErr> {
        Band::find_by_id(id).one(db).await
    }

    /// If ok, returns (band models, num pages).
    pub async fn find_bands_in_page(
        db: &DbConn,
        page: u64,
        bands_per_page: u64,
    ) -> Result<(Vec<band::Model>, u64), DbErr> {
        // Setup paginator
        let paginator = Band::find()
            .order_by_asc(band::Column::Id)
            .paginate(db, bands_per_page);
        let num_pages = paginator.num_pages().await?;

        // Fetch paginated bands
        paginator.fetch_page(page - 1).await.map(|p| (p, num_pages))
    }
}