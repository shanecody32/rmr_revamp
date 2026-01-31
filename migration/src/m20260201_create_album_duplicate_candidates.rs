use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(AlbumDuplicateCandidates::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(AlbumDuplicateCandidates::Id)
                            .unsigned()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(AlbumDuplicateCandidates::AlbumId1)
                            .unsigned()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(AlbumDuplicateCandidates::AlbumId2)
                            .unsigned()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(AlbumDuplicateCandidates::SimilarityScore)
                            .integer()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(AlbumDuplicateCandidates::MatchReasons)
                            .json()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(AlbumDuplicateCandidates::Status)
                            .string_len(20)
                            .not_null()
                            .default("pending"),
                    )
                    .col(
                        ColumnDef::new(AlbumDuplicateCandidates::ReviewedBy)
                            .unsigned()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(AlbumDuplicateCandidates::ReviewedAt)
                            .date_time()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(AlbumDuplicateCandidates::DetectedAt)
                            .date_time()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(AlbumDuplicateCandidates::ScanSettings)
                            .json()
                            .null(),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_album_dup_album_1")
                    .table(AlbumDuplicateCandidates::Table)
                    .col(AlbumDuplicateCandidates::AlbumId1)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_album_dup_album_2")
                    .table(AlbumDuplicateCandidates::Table)
                    .col(AlbumDuplicateCandidates::AlbumId2)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_album_dup_status")
                    .table(AlbumDuplicateCandidates::Table)
                    .col(AlbumDuplicateCandidates::Status)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_album_dup_detected")
                    .table(AlbumDuplicateCandidates::Table)
                    .col(AlbumDuplicateCandidates::DetectedAt)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("unique_album_pair")
                    .table(AlbumDuplicateCandidates::Table)
                    .col(AlbumDuplicateCandidates::AlbumId1)
                    .col(AlbumDuplicateCandidates::AlbumId2)
                    .unique()
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(AlbumDuplicateCandidates::Table).to_owned())
            .await
    }
}

#[derive(Iden)]
enum AlbumDuplicateCandidates {
    Table,
    Id,
    AlbumId1,
    AlbumId2,
    SimilarityScore,
    MatchReasons,
    Status,
    ReviewedBy,
    ReviewedAt,
    DetectedAt,
    ScanSettings,
}
