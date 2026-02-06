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
        let index_defs: &[(&str, &str, &str)] = &[
            // band_aliases phonetic keys
            ("idx_band_aliases_soundex", "band_aliases", "soundex_key"),
            ("idx_band_aliases_metaphone", "band_aliases", "metaphone_key"),
            ("idx_band_aliases_dmetaphone", "band_aliases", "dmetaphone_key"),
            // album_aliases phonetic keys
            ("idx_album_aliases_soundex", "album_aliases", "soundex_key"),
            ("idx_album_aliases_metaphone", "album_aliases", "metaphone_key"),
            // song_aliases phonetic keys
            ("idx_song_aliases_soundex", "song_aliases", "soundex_key"),
            ("idx_song_aliases_metaphone", "song_aliases", "metaphone_key"),
            // label_aliases phonetic keys
            ("idx_label_aliases_soundex", "label_aliases", "soundex_key"),
            // radio_station_aliases phonetic keys
            ("idx_radio_station_aliases_soundex", "radio_station_aliases", "soundex_key"),
            // staff_member_aliases phonetic keys
            ("idx_staff_member_aliases_soundex", "staff_member_aliases", "soundex_key"),
            // Slug indexes for URL lookups
            ("idx_bands_slug", "bands", "slug"),
            ("idx_albums_slug", "albums", "slug"),
            ("idx_songs_slug", "songs", "slug"),
            ("idx_songs_name", "songs", "name"),
            // Verified/Approved filter indexes
            ("idx_bands_verified", "bands", "verified"),
            ("idx_bands_approved", "bands", "approved"),
            ("idx_songs_verified", "songs", "verified"),
            ("idx_songs_approved", "songs", "approved"),
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
