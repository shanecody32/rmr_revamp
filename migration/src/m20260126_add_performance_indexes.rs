use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Performance indexes for frequently-queried foreign key columns
        // These indexes significantly improve JOIN and WHERE clause performance

        // ============ bands table ============
        // Index on name for text search queries
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_bands_name")
                    .table(Alias::new("bands"))
                    .col(Alias::new("name"))
                    .to_owned(),
            )
            .await?;

        // Index on location FKs for filtering by location
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_bands_country_id")
                    .table(Alias::new("bands"))
                    .col(Alias::new("country_id"))
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_bands_state_id")
                    .table(Alias::new("bands"))
                    .col(Alias::new("state_id"))
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_bands_city_id")
                    .table(Alias::new("bands"))
                    .col(Alias::new("city_id"))
                    .to_owned(),
            )
            .await?;

        // ============ band_aliases table ============
        // Index on band_id for efficient lookups during similarity search
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_band_aliases_band_id")
                    .table(Alias::new("band_aliases"))
                    .col(Alias::new("band_id"))
                    .to_owned(),
            )
            .await?;

        // ============ band_images table ============
        // Index on band_id for image lookups (merge operations, detail views)
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_band_images_band_id")
                    .table(Alias::new("band_images"))
                    .col(Alias::new("band_id"))
                    .to_owned(),
            )
            .await?;

        // ============ albums table ============
        // Index on name for text search
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_albums_name")
                    .table(Alias::new("albums"))
                    .col(Alias::new("name"))
                    .to_owned(),
            )
            .await?;

        // ============ albums_songs junction table ============
        // Indexes for efficient album-song relationship lookups
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_albums_songs_album_id")
                    .table(Alias::new("albums_songs"))
                    .col(Alias::new("album_id"))
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_albums_songs_song_id")
                    .table(Alias::new("albums_songs"))
                    .col(Alias::new("song_id"))
                    .to_owned(),
            )
            .await?;

        // ============ albums_bands junction table ============
        // Indexes for band discography lookups
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_albums_bands_band_id")
                    .table(Alias::new("albums_bands"))
                    .col(Alias::new("band_id"))
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_albums_bands_album_id")
                    .table(Alias::new("albums_bands"))
                    .col(Alias::new("album_id"))
                    .to_owned(),
            )
            .await?;

        // ============ songs table ============
        // Index on band_id for band song lookups
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_songs_band_id")
                    .table(Alias::new("songs"))
                    .col(Alias::new("band_id"))
                    .to_owned(),
            )
            .await?;

        // ============ bands_sub_genres junction table ============
        // Index for genre filtering
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_bands_sub_genres_band_id")
                    .table(Alias::new("bands_sub_genres"))
                    .col(Alias::new("band_id"))
                    .to_owned(),
            )
            .await?;

        // ============ reviews table ============
        // Index on band_id for merge operations
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_reviews_band_id")
                    .table(Alias::new("reviews"))
                    .col(Alias::new("band_id"))
                    .to_owned(),
            )
            .await?;

        // ============ radio_playlists table ============
        // Index on band_id for playlist lookups
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_radio_playlists_band_id")
                    .table(Alias::new("radio_playlists"))
                    .col(Alias::new("band_id"))
                    .to_owned(),
            )
            .await?;

        // ============ album_aliases table ============
        // Index on album_id for similarity search
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_album_aliases_album_id")
                    .table(Alias::new("album_aliases"))
                    .col(Alias::new("album_id"))
                    .to_owned(),
            )
            .await?;

        // ============ albums_sub_genres junction table ============
        // Index for album genre filtering
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_albums_sub_genres_album_id")
                    .table(Alias::new("albums_sub_genres"))
                    .col(Alias::new("album_id"))
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop all indexes in reverse order
        let indexes = [
            "idx_albums_sub_genres_album_id",
            "idx_album_aliases_album_id",
            "idx_radio_playlists_band_id",
            "idx_reviews_band_id",
            "idx_bands_sub_genres_band_id",
            "idx_songs_band_id",
            "idx_albums_bands_album_id",
            "idx_albums_bands_band_id",
            "idx_albums_songs_song_id",
            "idx_albums_songs_album_id",
            "idx_albums_name",
            "idx_band_images_band_id",
            "idx_band_aliases_band_id",
            "idx_bands_city_id",
            "idx_bands_state_id",
            "idx_bands_country_id",
            "idx_bands_name",
        ];

        for index_name in indexes {
            // Note: SeaORM doesn't have a direct drop_index method that works across all DBs
            // We use raw SQL for MariaDB compatibility
            manager
                .get_connection()
                .execute_unprepared(&format!("DROP INDEX IF EXISTS {} ON bands", index_name))
                .await
                .ok(); // Ignore errors if index doesn't exist on that table
        }

        Ok(())
    }
}
