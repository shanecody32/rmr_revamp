use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(LabelDuplicateCandidates::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(LabelDuplicateCandidates::Id)
                            .unsigned()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(LabelDuplicateCandidates::LabelId1)
                            .unsigned()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(LabelDuplicateCandidates::LabelId2)
                            .unsigned()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(LabelDuplicateCandidates::SimilarityScore)
                            .integer()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(LabelDuplicateCandidates::MatchReasons)
                            .json()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(LabelDuplicateCandidates::Status)
                            .string_len(20)
                            .not_null()
                            .default("pending"),
                    )
                    .col(
                        ColumnDef::new(LabelDuplicateCandidates::ReviewedBy)
                            .unsigned()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(LabelDuplicateCandidates::ReviewedAt)
                            .date_time()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(LabelDuplicateCandidates::DetectedAt)
                            .date_time()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(LabelDuplicateCandidates::ScanSettings)
                            .json()
                            .null(),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_label_dup_label_1")
                    .table(LabelDuplicateCandidates::Table)
                    .col(LabelDuplicateCandidates::LabelId1)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_label_dup_label_2")
                    .table(LabelDuplicateCandidates::Table)
                    .col(LabelDuplicateCandidates::LabelId2)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_label_dup_status")
                    .table(LabelDuplicateCandidates::Table)
                    .col(LabelDuplicateCandidates::Status)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_label_dup_detected")
                    .table(LabelDuplicateCandidates::Table)
                    .col(LabelDuplicateCandidates::DetectedAt)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("unique_label_pair")
                    .table(LabelDuplicateCandidates::Table)
                    .col(LabelDuplicateCandidates::LabelId1)
                    .col(LabelDuplicateCandidates::LabelId2)
                    .unique()
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(LabelDuplicateCandidates::Table).to_owned())
            .await
    }
}

#[derive(Iden)]
enum LabelDuplicateCandidates {
    Table,
    Id,
    LabelId1,
    LabelId2,
    SimilarityScore,
    MatchReasons,
    Status,
    ReviewedBy,
    ReviewedAt,
    DetectedAt,
    ScanSettings,
}
