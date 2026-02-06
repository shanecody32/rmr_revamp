use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Performance indexes for frequently-queried foreign key columns
        // Skip any table that doesn't exist (legacy tables may not be present)

        let index_defs: &[(&str, &str, &str)] = &[
            // bands table
            ("idx_bands_name", "bands", "name"),
            ("idx_bands_country_id", "bands", "country_id"),
            ("idx_bands_state_id", "bands", "state_id"),
            ("idx_bands_city_id", "bands", "city_id"),
            // band_aliases
            ("idx_band_aliases_band_id", "band_aliases", "band_id"),
            // band_images
            ("idx_band_images_band_id", "band_images", "band_id"),
            // albums
            ("idx_albums_name", "albums", "name"),
            // albums_songs
            ("idx_albums_songs_album_id", "albums_songs", "album_id"),
            ("idx_albums_songs_song_id", "albums_songs", "song_id"),
            // albums_bands
            ("idx_albums_bands_band_id", "albums_bands", "band_id"),
            ("idx_albums_bands_album_id", "albums_bands", "album_id"),
            // songs
            ("idx_songs_band_id", "songs", "band_id"),
            // bands_sub_genres
            ("idx_bands_sub_genres_band_id", "bands_sub_genres", "band_id"),
            // reviews
            ("idx_reviews_band_id", "reviews", "band_id"),
            // radio_playlists
            ("idx_radio_playlists_band_id", "radio_playlists", "band_id"),
            // album_aliases
            ("idx_album_aliases_album_id", "album_aliases", "album_id"),
            // albums_sub_genres
            ("idx_albums_sub_genres_album_id", "albums_sub_genres", "album_id"),
        ];

        for (idx_name, table, column) in index_defs {
            if !manager.has_table(*table).await? {
                eprintln!("Skipping index {} on {}: table does not exist", idx_name, table);
                continue;
            }
            manager
                .create_index(
                    Index::create()
                        .if_not_exists()
                        .name(*idx_name)
                        .table(Alias::new(*table))
                        .col(Alias::new(*column))
                        .to_owned(),
                )
                .await?;
        }

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
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
            manager
                .get_connection()
                .execute_unprepared(&format!("DROP INDEX IF EXISTS {} ON bands", index_name))
                .await
                .ok();
        }

        Ok(())
    }
}
