use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create band_duplicate_candidates table
        manager
            .create_table(
                Table::create()
                    .table(BandDuplicateCandidates::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(BandDuplicateCandidates::Id)
                            .unsigned()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(BandDuplicateCandidates::BandId1)
                            .unsigned()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(BandDuplicateCandidates::BandId2)
                            .unsigned()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(BandDuplicateCandidates::SimilarityScore)
                            .integer()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(BandDuplicateCandidates::MatchReasons)
                            .json()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(BandDuplicateCandidates::Status)
                            .string_len(20)
                            .not_null()
                            .default("pending"),
                    )
                    .col(
                        ColumnDef::new(BandDuplicateCandidates::ReviewedBy)
                            .unsigned()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(BandDuplicateCandidates::ReviewedAt)
                            .date_time()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(BandDuplicateCandidates::DetectedAt)
                            .date_time()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(BandDuplicateCandidates::ScanSettings)
                            .json()
                            .null(),
                    )
                    // Note: Foreign keys omitted because legacy bands table lacks primary key
                    // Referential integrity enforced at application level
                    .to_owned(),
            )
            .await?;

        // Create indexes for band_duplicate_candidates
        manager
            .create_index(
                Index::create()
                    .name("idx_band_dup_band_1")
                    .table(BandDuplicateCandidates::Table)
                    .col(BandDuplicateCandidates::BandId1)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_band_dup_band_2")
                    .table(BandDuplicateCandidates::Table)
                    .col(BandDuplicateCandidates::BandId2)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_band_dup_status")
                    .table(BandDuplicateCandidates::Table)
                    .col(BandDuplicateCandidates::Status)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_band_dup_similarity")
                    .table(BandDuplicateCandidates::Table)
                    .col(BandDuplicateCandidates::SimilarityScore)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_band_dup_detected")
                    .table(BandDuplicateCandidates::Table)
                    .col(BandDuplicateCandidates::DetectedAt)
                    .to_owned(),
            )
            .await?;

        // Unique constraint on band pair (ensures no duplicate entries for same pair)
        manager
            .create_index(
                Index::create()
                    .name("unique_band_pair")
                    .table(BandDuplicateCandidates::Table)
                    .col(BandDuplicateCandidates::BandId1)
                    .col(BandDuplicateCandidates::BandId2)
                    .unique()
                    .to_owned(),
            )
            .await?;

        // Create duplicate_scan_state table
        manager
            .create_table(
                Table::create()
                    .table(DuplicateScanState::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(DuplicateScanState::Id)
                            .unsigned()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(DuplicateScanState::LastProcessedBandId)
                            .unsigned()
                            .not_null()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(DuplicateScanState::TotalBandsScanned)
                            .unsigned()
                            .not_null()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(DuplicateScanState::DuplicatesFound)
                            .unsigned()
                            .not_null()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(DuplicateScanState::IsRunning)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .col(
                        ColumnDef::new(DuplicateScanState::StartedAt)
                            .date_time()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(DuplicateScanState::StoppedAt)
                            .date_time()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(DuplicateScanState::StopReason)
                            .string_len(20)
                            .null(),
                    )
                    .col(
                        ColumnDef::new(DuplicateScanState::LastError)
                            .text()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(DuplicateScanState::MinSimilarity)
                            .integer()
                            .not_null()
                            .default(95),
                    )
                    .col(
                        ColumnDef::new(DuplicateScanState::JwWeight)
                            .decimal_len(3, 2)
                            .not_null()
                            .default(0.60),
                    )
                    .col(
                        ColumnDef::new(DuplicateScanState::DiceWeight)
                            .decimal_len(3, 2)
                            .not_null()
                            .default(0.40),
                    )
                    .col(
                        ColumnDef::new(DuplicateScanState::MaxDuplicatesToFind)
                            .integer()
                            .not_null()
                            .default(1000),
                    )
                    .col(
                        ColumnDef::new(DuplicateScanState::BatchSize)
                            .integer()
                            .not_null()
                            .default(100),
                    )
                    .col(
                        ColumnDef::new(DuplicateScanState::DelayBetweenBatchesMs)
                            .integer()
                            .not_null()
                            .default(500),
                    )
                    .col(
                        ColumnDef::new(DuplicateScanState::ContinuousMode)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .col(
                        ColumnDef::new(DuplicateScanState::ContinuousDelayMinutes)
                            .integer()
                            .not_null()
                            .default(60),
                    )
                    .col(
                        ColumnDef::new(DuplicateScanState::UpdatedAt)
                            .date_time()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await?;

        // Insert default scan state row
        manager
            .get_connection()
            .execute_unprepared(
                "INSERT INTO duplicate_scan_state (id) VALUES (1) ON DUPLICATE KEY UPDATE id=id",
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(BandDuplicateCandidates::Table).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table(DuplicateScanState::Table).to_owned())
            .await?;

        Ok(())
    }
}

#[derive(Iden)]
enum BandDuplicateCandidates {
    Table,
    Id,
    BandId1,
    BandId2,
    SimilarityScore,
    MatchReasons,
    Status,
    ReviewedBy,
    ReviewedAt,
    DetectedAt,
    ScanSettings,
}

#[derive(Iden)]
enum DuplicateScanState {
    Table,
    Id,
    LastProcessedBandId,
    TotalBandsScanned,
    DuplicatesFound,
    IsRunning,
    StartedAt,
    StoppedAt,
    StopReason,
    LastError,
    MinSimilarity,
    JwWeight,
    DiceWeight,
    MaxDuplicatesToFind,
    BatchSize,
    DelayBetweenBatchesMs,
    ContinuousMode,
    ContinuousDelayMinutes,
    UpdatedAt,
}
