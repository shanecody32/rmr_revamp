use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        // Add band_type to bands table
        if manager.has_table("bands").await? {
            db.execute_unprepared(
                "ALTER TABLE `bands` ADD COLUMN IF NOT EXISTS `band_type` VARCHAR(20) NOT NULL DEFAULT 'artist'"
            ).await?;
            db.execute_unprepared(
                "CREATE INDEX IF NOT EXISTS idx_bands_type ON bands (band_type)"
            ).await?;
        } else {
            eprintln!("Skipping add_entity_type_fields for bands: table does not exist");
        }

        // Add format to albums table
        if manager.has_table("albums").await? {
            db.execute_unprepared(
                "ALTER TABLE `albums` ADD COLUMN IF NOT EXISTS `format` VARCHAR(20) NOT NULL DEFAULT 'lp'"
            ).await?;
            db.execute_unprepared(
                "CREATE INDEX IF NOT EXISTS idx_albums_format ON albums (format)"
            ).await?;
        } else {
            eprintln!("Skipping add_entity_type_fields for albums: table does not exist");
        }

        // Add version_type and original_song_id to songs table
        if manager.has_table("songs").await? {
            db.execute_unprepared(
                "ALTER TABLE `songs` ADD COLUMN IF NOT EXISTS `version_type` VARCHAR(20) NOT NULL DEFAULT 'original'"
            ).await?;
            db.execute_unprepared(
                "ALTER TABLE `songs` ADD COLUMN IF NOT EXISTS `original_song_id` INT UNSIGNED NULL"
            ).await?;
            db.execute_unprepared(
                "CREATE INDEX IF NOT EXISTS idx_songs_original ON songs (original_song_id)"
            ).await?;
            db.execute_unprepared(
                "CREATE INDEX IF NOT EXISTS idx_songs_version_type ON songs (version_type)"
            ).await?;
        } else {
            eprintln!("Skipping add_entity_type_fields for songs: table does not exist");
        }

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        if manager.has_table("songs").await? {
            manager.drop_index(Index::drop().name("idx_songs_version_type").table(Songs::Table).to_owned()).await?;
            manager.drop_index(Index::drop().name("idx_songs_original").table(Songs::Table).to_owned()).await?;
            manager.alter_table(Table::alter().table(Songs::Table).drop_column(Songs::OriginalSongId).to_owned()).await?;
            manager.alter_table(Table::alter().table(Songs::Table).drop_column(Songs::VersionType).to_owned()).await?;
        }
        if manager.has_table("albums").await? {
            manager.drop_index(Index::drop().name("idx_albums_format").table(Albums::Table).to_owned()).await?;
            manager.alter_table(Table::alter().table(Albums::Table).drop_column(Albums::Format).to_owned()).await?;
        }
        if manager.has_table("bands").await? {
            manager.drop_index(Index::drop().name("idx_bands_type").table(Bands::Table).to_owned()).await?;
            manager.alter_table(Table::alter().table(Bands::Table).drop_column(Bands::BandType).to_owned()).await?;
        }

        Ok(())
    }
}

#[derive(Iden)]
enum Bands {
    Table,
    BandType,
}

#[derive(Iden)]
enum Albums {
    Table,
    Format,
}

#[derive(Iden)]
enum Songs {
    Table,
    VersionType,
    OriginalSongId,
}
