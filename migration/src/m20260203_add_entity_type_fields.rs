use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Add band_type to bands table
        manager
            .alter_table(
                Table::alter()
                    .table(Bands::Table)
                    .add_column(
                        ColumnDef::new(Bands::BandType)
                            .string_len(20)
                            .not_null()
                            .default("artist"),
                    )
                    .to_owned(),
            )
            .await?;

        // Add format to albums table
        manager
            .alter_table(
                Table::alter()
                    .table(Albums::Table)
                    .add_column(
                        ColumnDef::new(Albums::Format)
                            .string_len(20)
                            .not_null()
                            .default("lp"),
                    )
                    .to_owned(),
            )
            .await?;

        // Add version_type and original_song_id to songs table
        manager
            .alter_table(
                Table::alter()
                    .table(Songs::Table)
                    .add_column(
                        ColumnDef::new(Songs::VersionType)
                            .string_len(20)
                            .not_null()
                            .default("original"),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .alter_table(
                Table::alter()
                    .table(Songs::Table)
                    .add_column(
                        ColumnDef::new(Songs::OriginalSongId)
                            .unsigned()
                            .null(),
                    )
                    .to_owned(),
            )
            .await?;

        // Add index on original_song_id for version lookups
        manager
            .create_index(
                Index::create()
                    .name("idx_songs_original")
                    .table(Songs::Table)
                    .col(Songs::OriginalSongId)
                    .to_owned(),
            )
            .await?;

        // Add index on band_type
        manager
            .create_index(
                Index::create()
                    .name("idx_bands_type")
                    .table(Bands::Table)
                    .col(Bands::BandType)
                    .to_owned(),
            )
            .await?;

        // Add index on album format
        manager
            .create_index(
                Index::create()
                    .name("idx_albums_format")
                    .table(Albums::Table)
                    .col(Albums::Format)
                    .to_owned(),
            )
            .await?;

        // Add index on song version_type
        manager
            .create_index(
                Index::create()
                    .name("idx_songs_version_type")
                    .table(Songs::Table)
                    .col(Songs::VersionType)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop indexes
        manager
            .drop_index(Index::drop().name("idx_songs_version_type").table(Songs::Table).to_owned())
            .await?;
        manager
            .drop_index(Index::drop().name("idx_albums_format").table(Albums::Table).to_owned())
            .await?;
        manager
            .drop_index(Index::drop().name("idx_bands_type").table(Bands::Table).to_owned())
            .await?;
        manager
            .drop_index(Index::drop().name("idx_songs_original").table(Songs::Table).to_owned())
            .await?;

        // Drop columns
        manager
            .alter_table(
                Table::alter()
                    .table(Songs::Table)
                    .drop_column(Songs::OriginalSongId)
                    .to_owned(),
            )
            .await?;
        manager
            .alter_table(
                Table::alter()
                    .table(Songs::Table)
                    .drop_column(Songs::VersionType)
                    .to_owned(),
            )
            .await?;
        manager
            .alter_table(
                Table::alter()
                    .table(Albums::Table)
                    .drop_column(Albums::Format)
                    .to_owned(),
            )
            .await?;
        manager
            .alter_table(
                Table::alter()
                    .table(Bands::Table)
                    .drop_column(Bands::BandType)
                    .to_owned(),
            )
            .await?;

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
