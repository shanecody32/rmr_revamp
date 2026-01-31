use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(SongDuplicateCandidates::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(SongDuplicateCandidates::Id)
                            .unsigned()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(SongDuplicateCandidates::SongId1)
                            .unsigned()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(SongDuplicateCandidates::SongId2)
                            .unsigned()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(SongDuplicateCandidates::SimilarityScore)
                            .integer()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(SongDuplicateCandidates::MatchReasons)
                            .json()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(SongDuplicateCandidates::Status)
                            .string_len(20)
                            .not_null()
                            .default("pending"),
                    )
                    .col(
                        ColumnDef::new(SongDuplicateCandidates::ReviewedBy)
                            .unsigned()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(SongDuplicateCandidates::ReviewedAt)
                            .date_time()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(SongDuplicateCandidates::DetectedAt)
                            .date_time()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(SongDuplicateCandidates::ScanSettings)
                            .json()
                            .null(),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_song_dup_song_1")
                    .table(SongDuplicateCandidates::Table)
                    .col(SongDuplicateCandidates::SongId1)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_song_dup_song_2")
                    .table(SongDuplicateCandidates::Table)
                    .col(SongDuplicateCandidates::SongId2)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_song_dup_status")
                    .table(SongDuplicateCandidates::Table)
                    .col(SongDuplicateCandidates::Status)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_song_dup_detected")
                    .table(SongDuplicateCandidates::Table)
                    .col(SongDuplicateCandidates::DetectedAt)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("unique_song_pair")
                    .table(SongDuplicateCandidates::Table)
                    .col(SongDuplicateCandidates::SongId1)
                    .col(SongDuplicateCandidates::SongId2)
                    .unique()
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(SongDuplicateCandidates::Table).to_owned())
            .await
    }
}

#[derive(Iden)]
enum SongDuplicateCandidates {
    Table,
    Id,
    SongId1,
    SongId2,
    SimilarityScore,
    MatchReasons,
    Status,
    ReviewedBy,
    ReviewedAt,
    DetectedAt,
    ScanSettings,
}
