use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(RadioStationDuplicateCandidates::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(RadioStationDuplicateCandidates::Id)
                            .unsigned()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(RadioStationDuplicateCandidates::RadioStationId1)
                            .unsigned()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(RadioStationDuplicateCandidates::RadioStationId2)
                            .unsigned()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(RadioStationDuplicateCandidates::SimilarityScore)
                            .integer()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(RadioStationDuplicateCandidates::MatchReasons)
                            .json()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(RadioStationDuplicateCandidates::Status)
                            .string_len(20)
                            .not_null()
                            .default("pending"),
                    )
                    .col(
                        ColumnDef::new(RadioStationDuplicateCandidates::ReviewedBy)
                            .unsigned()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(RadioStationDuplicateCandidates::ReviewedAt)
                            .date_time()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(RadioStationDuplicateCandidates::DetectedAt)
                            .date_time()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(RadioStationDuplicateCandidates::ScanSettings)
                            .json()
                            .null(),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_radio_dup_radio_1")
                    .table(RadioStationDuplicateCandidates::Table)
                    .col(RadioStationDuplicateCandidates::RadioStationId1)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_radio_dup_radio_2")
                    .table(RadioStationDuplicateCandidates::Table)
                    .col(RadioStationDuplicateCandidates::RadioStationId2)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_radio_dup_status")
                    .table(RadioStationDuplicateCandidates::Table)
                    .col(RadioStationDuplicateCandidates::Status)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_radio_dup_detected")
                    .table(RadioStationDuplicateCandidates::Table)
                    .col(RadioStationDuplicateCandidates::DetectedAt)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("unique_radio_station_pair")
                    .table(RadioStationDuplicateCandidates::Table)
                    .col(RadioStationDuplicateCandidates::RadioStationId1)
                    .col(RadioStationDuplicateCandidates::RadioStationId2)
                    .unique()
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(
                Table::drop()
                    .table(RadioStationDuplicateCandidates::Table)
                    .to_owned(),
            )
            .await
    }
}

#[derive(Iden)]
enum RadioStationDuplicateCandidates {
    Table,
    Id,
    RadioStationId1,
    RadioStationId2,
    SimilarityScore,
    MatchReasons,
    Status,
    ReviewedBy,
    ReviewedAt,
    DetectedAt,
    ScanSettings,
}
