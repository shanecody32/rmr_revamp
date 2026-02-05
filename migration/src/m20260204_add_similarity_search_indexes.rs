//! Additional performance indexes for similarity search and common filters.
//!
//! This migration adds indexes on:
//! - Phonetic key columns on alias tables (for similarity search narrowing)
//! - slug columns on main entity tables (for URL lookups)
//! - verified/approved columns (for common filters)

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // ============ Phonetic key indexes on alias tables ============
        // These support the similarity search DB narrowing phase

        // band_aliases phonetic keys
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_band_aliases_soundex")
                    .table(Alias::new("band_aliases"))
                    .col(Alias::new("soundex_key"))
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_band_aliases_metaphone")
                    .table(Alias::new("band_aliases"))
                    .col(Alias::new("metaphone_key"))
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_band_aliases_dmetaphone")
                    .table(Alias::new("band_aliases"))
                    .col(Alias::new("dmetaphone_key"))
                    .to_owned(),
            )
            .await?;

        // album_aliases phonetic keys
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_album_aliases_soundex")
                    .table(Alias::new("album_aliases"))
                    .col(Alias::new("soundex_key"))
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_album_aliases_metaphone")
                    .table(Alias::new("album_aliases"))
                    .col(Alias::new("metaphone_key"))
                    .to_owned(),
            )
            .await?;

        // song_aliases phonetic keys
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_song_aliases_soundex")
                    .table(Alias::new("song_aliases"))
                    .col(Alias::new("soundex_key"))
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_song_aliases_metaphone")
                    .table(Alias::new("song_aliases"))
                    .col(Alias::new("metaphone_key"))
                    .to_owned(),
            )
            .await?;

        // label_aliases phonetic keys
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_label_aliases_soundex")
                    .table(Alias::new("label_aliases"))
                    .col(Alias::new("soundex_key"))
                    .to_owned(),
            )
            .await?;

        // radio_station_aliases phonetic keys
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_radio_station_aliases_soundex")
                    .table(Alias::new("radio_station_aliases"))
                    .col(Alias::new("soundex_key"))
                    .to_owned(),
            )
            .await?;

        // staff_member_aliases phonetic keys
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_staff_member_aliases_soundex")
                    .table(Alias::new("staff_member_aliases"))
                    .col(Alias::new("soundex_key"))
                    .to_owned(),
            )
            .await?;

        // ============ Slug indexes for URL lookups ============

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_bands_slug")
                    .table(Alias::new("bands"))
                    .col(Alias::new("slug"))
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_albums_slug")
                    .table(Alias::new("albums"))
                    .col(Alias::new("slug"))
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_songs_slug")
                    .table(Alias::new("songs"))
                    .col(Alias::new("slug"))
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_songs_name")
                    .table(Alias::new("songs"))
                    .col(Alias::new("name"))
                    .to_owned(),
            )
            .await?;

        // ============ Verified/Approved filter indexes ============
        // These are commonly used in list queries

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_bands_verified")
                    .table(Alias::new("bands"))
                    .col(Alias::new("verified"))
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_bands_approved")
                    .table(Alias::new("bands"))
                    .col(Alias::new("approved"))
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_songs_verified")
                    .table(Alias::new("songs"))
                    .col(Alias::new("verified"))
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_songs_approved")
                    .table(Alias::new("songs"))
                    .col(Alias::new("approved"))
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop indexes in reverse order
        let indexes_and_tables = [
            ("idx_songs_approved", "songs"),
            ("idx_songs_verified", "songs"),
            ("idx_bands_approved", "bands"),
            ("idx_bands_verified", "bands"),
            ("idx_songs_name", "songs"),
            ("idx_songs_slug", "songs"),
            ("idx_albums_slug", "albums"),
            ("idx_bands_slug", "bands"),
            ("idx_staff_member_aliases_soundex", "staff_member_aliases"),
            ("idx_radio_station_aliases_soundex", "radio_station_aliases"),
            ("idx_label_aliases_soundex", "label_aliases"),
            ("idx_song_aliases_metaphone", "song_aliases"),
            ("idx_song_aliases_soundex", "song_aliases"),
            ("idx_album_aliases_metaphone", "album_aliases"),
            ("idx_album_aliases_soundex", "album_aliases"),
            ("idx_band_aliases_dmetaphone", "band_aliases"),
            ("idx_band_aliases_metaphone", "band_aliases"),
            ("idx_band_aliases_soundex", "band_aliases"),
        ];

        for (index_name, table_name) in indexes_and_tables {
            manager
                .get_connection()
                .execute_unprepared(&format!("DROP INDEX IF EXISTS {} ON {}", index_name, table_name))
                .await
                .ok();
        }

        Ok(())
    }
}
