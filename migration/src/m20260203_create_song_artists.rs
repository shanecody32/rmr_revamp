use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create song_artists table for proper band-linked artist credits
        manager
            .create_table(
                Table::create()
                    .table(SongArtists::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(SongArtists::Id)
                            .unsigned()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(SongArtists::SongId)
                            .unsigned()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(SongArtists::BandId)
                            .unsigned()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(SongArtists::Role)
                            .string_len(20)
                            .not_null()
                            .default("primary"),
                    )
                    .col(
                        ColumnDef::new(SongArtists::Created)
                            .date_time()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(SongArtists::Modified)
                            .date_time()
                            .null(),
                    )
                    .to_owned(),
            )
            .await?;

        // Create unique index on song_id + band_id + role
        manager
            .create_index(
                Index::create()
                    .name("unique_song_artist_role")
                    .table(SongArtists::Table)
                    .col(SongArtists::SongId)
                    .col(SongArtists::BandId)
                    .col(SongArtists::Role)
                    .unique()
                    .to_owned(),
            )
            .await?;

        // Index on song_id for lookups
        manager
            .create_index(
                Index::create()
                    .name("idx_song_artists_song")
                    .table(SongArtists::Table)
                    .col(SongArtists::SongId)
                    .to_owned(),
            )
            .await?;

        // Index on band_id for reverse lookups
        manager
            .create_index(
                Index::create()
                    .name("idx_song_artists_band")
                    .table(SongArtists::Table)
                    .col(SongArtists::BandId)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(SongArtists::Table).to_owned())
            .await
    }
}

#[derive(Iden)]
enum SongArtists {
    Table,
    Id,
    SongId,
    BandId,
    Role,
    Created,
    Modified,
}
